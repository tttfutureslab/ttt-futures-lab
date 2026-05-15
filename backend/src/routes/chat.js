import { Router } from 'express';
import multer from 'multer';
import { claude, CLAUDE_MODEL } from '../services/claude.js';
import { query } from '../db/pool.js';
import { buildSharedContext } from '../services/sharedContext.js';
import { TOOLS_TRADING, TOOLS_GESTION, TOOLS_BACKTESTING, executeTool } from '../services/tools.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const WEB_SEARCH_TOOL = { type: 'web_search_20250305', name: 'web_search' };
const ALL_TOOLS = [...TOOLS_TRADING, ...TOOLS_GESTION, ...TOOLS_BACKTESTING, WEB_SEARCH_TOOL];

const PROMPT_BASE = `Eres asistente de TTT Futures Lab. Trading de futuros NQ basado en ICT.

CONTEXTO TRADER:
- Estrategia v18: TP +750 / SL -250 / R:R 3:1
- ICT: XAMD/AMDX, CISD, IRL/ERL, OTE, BPR, IFVG, Power of Three, Quarters
- Sesiones: Asia, London, NY AM, NY PM
- Prop firms: TopOne, Tradeify, MFFU

CHECKLIST v18:
1. Q3 o Q4 | 2. Direccion tendencia | 3. OTE + ERL/IRL tomada
4. CISD LTF | 5. BPR o IFVG | 6. CISD HTF

═══════════════════════════════════════════════
HERRAMIENTAS DISPONIBLES (todas en todos los chats)
═══════════════════════════════════════════════

TRADES REALES:
- log_trade / list_recent_trades / update_trade / delete_trade

CUENTAS:
- create_account / save_account_snapshot / update_account_status / rename_account

NORMAS DE PROP FIRMS:
- list_rules / add_rule / update_rule / delete_rule

BACKTEST v18:
- log_backtest_trade / update_backtest_trade / delete_backtest_trade

INVESTIGACION:
- web_search

═══════════════════════════════════════════════
REGLAS CRITICAS DE EJECUCION (NO NEGOCIABLES)
═══════════════════════════════════════════════

1. EJECUTA, NO DESCRIBAS:
   Cuando el usuario te pida guardar/cargar/anadir/actualizar algo, DEBES LLAMAR LA TOOL.
   NUNCA digas "voy a cargar..." sin llamar inmediatamente la tool.
   NUNCA presentes solo una tabla o lista de lo que "vas a hacer" - hazlo.

2. NUNCA INVENTES:
   Si no sabes algo con certeza, usa web_search.
   Si despues de buscar no encuentras dato, di "No tengo esa informacion confirmada".

3. NUNCA digas "no tengo herramienta para X":
   Las tools listadas arriba estan disponibles. Si dudas, intenta llamarla.

4. ENCADENA TOOLS:
   Si haces web_search, INMEDIATAMENTE despues llama a las tools necesarias
   (add_rule, save_account_snapshot, etc) - no te quedes solo con el resumen.

5. CONFIRMA TRAS GUARDAR:
   Despues de cada tool de guardado, di que la ejecutaste y resume brevemente.

6. Espanol, directo, tecnico.

═══════════════════════════════════════════════
EJEMPLO CORRECTO de carga de normas
═══════════════════════════════════════════════

Usuario: "Carga las normas de Tradeify"
TU FLUJO:
1. Llamas web_search("Tradeify futures prop firm rules drawdown payout 50K")
2. Despues de leer, llamas add_rule (UNA POR UNA) para cada norma encontrada:
   - add_rule(tradeify, drawdown, trailing_dd_50k, "2000", source)
   - add_rule(tradeify, payout, min_trading_days, "5", source)
   - ...
3. Al final dices: "Cargadas 8 normas de Tradeify desde tradeify.com"

PROHIBIDO: presentar las normas en texto/tabla sin haber llamado a add_rule.`;

const PROMPT_TRADING = PROMPT_BASE + `

ROL TRADING: Analista ICT validando trades reales.
- Usuario pega captura + dice TP/SL/BE/parcial
- Analizas tecnicamente, registras con log_trade
- Si pide editar trade: list_recent_trades → update_trade
- Si pide gestionar cuentas o normas: tienes esas tools tambien, EJECUTALAS.`;

const PROMPT_GESTION = PROMPT_BASE + `

ROL GESTION: Foco en cuentas y normas de prop firms.
- Captura de dashboard: extrae datos, save_account_snapshot
- Cambios status: update_account_status
- NORMAS: si te piden cargar, usa web_search Y DESPUES add_rule por cada una.
- Cita fuente oficial.`;

const PROMPT_BACKTESTING = PROMPT_BASE + `

ROL BACKTESTING v18: Foco en el backtest manual NQ.
Estado: 35 trades, +9865 USD, WR 53.3%. Asia debil, NY fuerte.
- log_backtest_trade / update_backtest_trade / delete_backtest_trade`;

const PROMPTS_BY_KIND = { trading: PROMPT_TRADING, gestion: PROMPT_GESTION, backtesting: PROMPT_BACKTESTING };

async function callClaudeWithRetry(params, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await claude.messages.create(params);
    } catch (err) {
      const isOverloaded = err.status === 529 || (err.message || '').includes('overloaded');
      if (!isOverloaded || attempt === maxRetries - 1) throw err;
      const delay = 1000 * Math.pow(2, attempt);
      console.log(`[Claude] Overloaded retry ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

router.post('/:kind/message', upload.single('image'), async (req, res) => {
  try {
    const kind = req.params.kind;
    if (!['trading', 'gestion', 'backtesting'].includes(kind)) {
      return res.status(400).json({ error: 'Tipo de chat invalido' });
    }
    const message = (req.body.message || '').trim();
    if (!message && !req.file) return res.status(400).json({ error: 'Mensaje vacio' });

    const userContentText = message || (req.file ? '(captura adjunta sin texto)' : '');

    await query(
      'INSERT INTO chat_messages (session_id, role, content, chat_kind, image_url) VALUES ($1, $2, $3, $4, $5)',
      [kind + '_main', 'user', userContentText, kind, req.file ? '[image attached]' : null]
    );

    const history = await query(
      `SELECT role, content FROM chat_messages
       WHERE chat_kind = $1 AND content IS NOT NULL AND content != ''
       ORDER BY created_at DESC LIMIT 15`,
      [kind]
    );
    const orderedHistory = history.rows.reverse();
    const sharedContext = await buildSharedContext(kind);

    const messages = orderedHistory.slice(0, -1)
      .filter((m) => m.content && m.content.trim().length > 0)
      .map((m) => ({ role: m.role, content: m.content }));

    const lastUserContent = [];
    if (req.file) {
      lastUserContent.push({
        type: 'image',
        source: { type: 'base64', media_type: req.file.mimetype, data: req.file.buffer.toString('base64') }
      });
    }
    lastUserContent.push({ type: 'text', text: message || 'Analiza esta captura.' });
    messages.push({ role: 'user', content: lastUserContent });

    const systemPrompt = PROMPTS_BY_KIND[kind] + '\n\nCONTEXTO:\n' + JSON.stringify(sharedContext);

    let response;
    const accumulatedToolCalls = [];
    let safetyCounter = 0;
    const MAX_LOOPS = 15; // mas margen para encadenar tools

    while (safetyCounter < MAX_LOOPS) {
      safetyCounter++;
      response = await callClaudeWithRetry({
        model: CLAUDE_MODEL,
        max_tokens: 2500,
        system: systemPrompt,
        tools: ALL_TOOLS,
        messages
      });

      console.log(`[Chat ${kind}] Loop ${safetyCounter} stop_reason=${response.stop_reason}`);

      if (response.stop_reason !== 'tool_use') break;

      const toolUseBlocks = response.content.filter((c) => c.type === 'tool_use');
      messages.push({ role: 'assistant', content: response.content });

      const toolResults = [];
      let executedSomething = false;

      for (const tu of toolUseBlocks) {
        if (tu.name === 'web_search') {
          // Anthropic la procesa internamente, NO devolvemos tool_result
          // pero NO rompemos el bucle: dejamos que el modelo continue encadenando
          accumulatedToolCalls.push({ name: 'web_search', input: tu.input, result: { managed_by: 'anthropic' } });
          executedSomething = true;
          continue;
        }
        const result = await executeTool(tu.name, tu.input);
        console.log(`[Chat ${kind}] Tool ${tu.name} ->`, JSON.stringify(result).slice(0, 200));
        accumulatedToolCalls.push({ name: tu.name, input: tu.input, result });
        toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(result) });
        executedSomething = true;
      }

      // Solo añadimos tool_results manuales si hay alguno (no web_search)
      if (toolResults.length > 0) {
        messages.push({ role: 'user', content: toolResults });
      }

      // Si solo se uso web_search en este turno, el modelo debe continuar sin tool_result manual.
      // Anthropic gestiona internamente el resultado de la busqueda.
      // Por tanto NO rompemos el bucle aquí: dejamos al modelo continuar.
      if (!executedSomething) break;
    }

    const assistantText = response.content.filter((c) => c.type === 'text').map((c) => c.text).join('\n')
      || '(Respuesta vacia - reintenta)';

    await query(
      'INSERT INTO chat_messages (session_id, role, content, chat_kind, tool_calls) VALUES ($1, $2, $3, $4, $5)',
      [kind + '_main', 'assistant', assistantText, kind, accumulatedToolCalls.length ? JSON.stringify(accumulatedToolCalls) : null]
    );

    res.json({ message: assistantText, tool_calls: accumulatedToolCalls });
  } catch (err) {
    console.error('Chat ' + req.params.kind + ' error:', err);
    let userMsg = err.message;
    if (err.status === 529) userMsg = 'Servidores Claude sobrecargados. Reintenta en 1 minuto.';
    if (err.status === 429) userMsg = 'Limite de uso. Espera 1 minuto.';
    if (err.status === 401) userMsg = 'API key invalida.';
    res.status(err.status || 500).json({ error: userMsg });
  }
});

router.get('/:kind/history', async (req, res) => {
  try {
    const result = await query(
      'SELECT role, content, created_at, image_url FROM chat_messages WHERE chat_kind = $1 ORDER BY created_at ASC LIMIT 200',
      [req.params.kind]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:kind/history', async (req, res) => {
  try {
    await query('DELETE FROM chat_messages WHERE chat_kind = $1', [req.params.kind]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
