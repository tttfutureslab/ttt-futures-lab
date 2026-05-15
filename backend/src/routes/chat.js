import { Router } from 'express';
import multer from 'multer';
import { claude, CLAUDE_MODEL } from '../services/claude.js';
import { query } from '../db/pool.js';
import { buildSharedContext } from '../services/sharedContext.js';
import { TOOLS_TRADING, TOOLS_GESTION, TOOLS_BACKTESTING, executeTool } from '../services/tools.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Web search tool de Anthropic (la misma que usamos para refrescar normas)
const WEB_SEARCH_TOOL = { type: 'web_search_20250305', name: 'web_search' };

const PROMPT_BASE = `Eres asistente de TTT Futures Lab. Trading de futuros NQ basado en ICT.

CONTEXTO TRADER:
- Estrategia v18: TP +750 / SL -250 / R:R 3:1
- ICT: XAMD/AMDX, CISD, IRL/ERL, OTE, BPR, IFVG, Power of Three, Quarters
- Sesiones: Asia, London, NY AM, NY PM
- Prop firms: TopOne, Tradeify, MFFU

CHECKLIST v18:
1. Q3 o Q4 | 2. Direccion tendencia | 3. OTE + ERL/IRL tomada
4. CISD LTF | 5. BPR o IFVG | 6. CISD HTF

═══ REGLAS CRITICAS ═══
- NUNCA INVENTES INFORMACION. Si no sabes algo con certeza, DEBES:
  a) Usar web_search para buscar la informacion actualizada
  b) Si tras buscar tampoco lo sabes, di "No tengo esa informacion confirmada"
- NO ASUMAS NORMAS NI POLITICAS de prop firms. Busca siempre la fuente oficial.
- NO REINVENTES estructuras de pago, drawdowns, consistencia. Verifica.
- Cuando uses web_search, MENCIONA brevemente la fuente al usuario.
- Espanol, directo, tecnico, conciso.
- Cuando uses una tool de guardado, confirma brevemente que guardaste.`;

const PROMPT_TRADING = PROMPT_BASE + `

ROL TRADING: Analista ICT que valida trades reales en vivo.

WORKFLOW:
- Usuario pega captura + dice TP/SL/BE/parcial y por que
- Analiza tecnicamente la captura
- Evalua decision del usuario
- Si SL: identifica que se pudo filtrar
- SIEMPRE registra con log_trade

EDICION DE TRADES:
- Si el usuario dice que asignaste un trade mal (cuenta incorrecta, sesion incorrecta, etc):
  1. Usa list_recent_trades para ver los ultimos trades con sus IDs
  2. Identifica el correcto y usa update_trade
- Si pide borrar un trade: usa list_recent_trades + delete_trade
- NUNCA digas "no puedo hacerlo" - tienes update_trade y delete_trade disponibles.`;

const PROMPT_GESTION = PROMPT_BASE + `

ROL GESTION: Gestionas las cuentas en prop firms.

WORKFLOW:
- Captura de dashboard: extrae datos, usa save_account_snapshot
- Si cuenta no existe: create_account primero
- Cambiar status (passed/blown/archived/paused/active): update_account_status
- Renombrar: rename_account
- Alertas: daily loss >70% ALERTA, trailing DD >80% CRITICO, consistencia >30% RIESGO

NORMAS DE PROP FIRMS:
- Si te preguntan algo especifico (payout, scaling, consistencia, fees, daily loss): USA web_search
- TopOne, Tradeify y MFFU cambian normas frecuentemente, NO ASUMAS
- Tambien tienes acceso a "rules" en el contexto compartido (cron diario), pero priorizar web_search si el usuario pregunta algo concreto
- Cita siempre la fuente oficial (web de la prop firm)`;

const PROMPT_BACKTESTING = PROMPT_BASE + `

ROL BACKTESTING v18: Backtest manual NQ Mar-Abr 2026.
Estado actual: 35 trades, +9865 USD, WR 53.3%. Asia debil (20%), NY fuerte (75%).

WORKFLOW:
- Trade nuevo dictado: log_backtest_trade
- Corregir trade existente: update_backtest_trade (necesitas el trade_number)
- Borrar trade: delete_backtest_trade
- Stats: analiza el contexto y responde con numeros concretos
- Sugiere patrones cuando los detectes

INVESTIGACION:
- Si te preguntan algo sobre metodologia ICT que necesita verificacion (ej. teorias de Inner Circle Trader), usa web_search
- No inventes definiciones ICT ni teorias - busca o admite desconocimiento`;

const PROMPTS_BY_KIND = { trading: PROMPT_TRADING, gestion: PROMPT_GESTION, backtesting: PROMPT_BACKTESTING };
const TOOLS_BY_KIND = {
  trading: [...TOOLS_TRADING, WEB_SEARCH_TOOL],
  gestion: [...TOOLS_GESTION, WEB_SEARCH_TOOL],
  backtesting: [...TOOLS_BACKTESTING, WEB_SEARCH_TOOL]
};

async function callClaudeWithRetry(params, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await claude.messages.create(params);
    } catch (err) {
      const isOverloaded = err.status === 529 || (err.message || '').includes('overloaded');
      const isLastAttempt = attempt === maxRetries - 1;
      if (!isOverloaded || isLastAttempt) throw err;
      const delay = 1000 * Math.pow(2, attempt);
      console.log(`[Claude] Overloaded, retry en ${delay}ms (${attempt + 1}/${maxRetries})`);
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

    while (safetyCounter < 8) {
      safetyCounter++;
      response = await callClaudeWithRetry({
        model: CLAUDE_MODEL,
        max_tokens: 2000,
        system: systemPrompt,
        tools: TOOLS_BY_KIND[kind],
        messages
      });
      if (response.stop_reason !== 'tool_use') break;

      const toolUseBlocks = response.content.filter((c) => c.type === 'tool_use');
      messages.push({ role: 'assistant', content: response.content });

      const toolResults = [];
      for (const tu of toolUseBlocks) {
        // web_search la maneja Anthropic internamente, no la ejecutamos nosotros
        if (tu.name === 'web_search') {
          // Anthropic gestiona automaticamente la herramienta de busqueda
          // No anyadimos tool_result manual: el modelo continua tras la respuesta
          continue;
        }
        const result = await executeTool(tu.name, tu.input);
        accumulatedToolCalls.push({ name: tu.name, input: tu.input, result });
        toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(result) });
      }

      // Si solo se uso web_search (la maneja Anthropic), no continuamos manualmente:
      // la API ya devolvera la siguiente parte. Solo continuamos si hay tool_results manuales.
      if (toolResults.length === 0) break;

      messages.push({ role: 'user', content: toolResults });
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
    if (err.status === 529) userMsg = 'Servidores de Claude sobrecargados. Reintenta en 1 minuto.';
    if (err.status === 429) userMsg = 'Limite de uso alcanzado. Espera 1 minuto.';
    if (err.status === 401) userMsg = 'API key invalida. Revisa ANTHROPIC_API_KEY en Railway.';
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
