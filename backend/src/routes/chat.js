import { Router } from 'express';
import multer from 'multer';
import { claude, CLAUDE_MODEL } from '../services/claude.js';
import { query } from '../db/pool.js';
import { buildSharedContext } from '../services/sharedContext.js';
import { TOOLS_TRADING, TOOLS_GESTION, TOOLS_BACKTESTING, executeTool } from '../services/tools.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const PROMPT_BASE = `Eres asistente de TTT Futures Lab. Trading de futuros NQ basado en ICT.

CONTEXTO TRADER:
- Estrategia v18: TP +750 / SL -250 / R:R 3:1
- ICT: XAMD/AMDX, CISD, IRL/ERL, OTE, BPR, IFVG, Power of Three, Quarters
- Sesiones: Asia, London, NY AM, NY PM
- Prop firms: TopOne, Tradeify, MFFU

CHECKLIST v18:
1. Q3 o Q4 | 2. Direccion tendencia | 3. OTE + ERL/IRL tomada
4. CISD LTF | 5. BPR o IFVG | 6. CISD HTF

REGLAS:
- Espanol, directo, tecnico
- Cuando uses una tool confirma brevemente que guardaste
- Respuestas concisas`;

const PROMPT_TRADING = PROMPT_BASE + `

ROL TRADING: Analista ICT que valida trades en vivo. Usuario pasa captura + dice TP/SL/BE/parcial y por que.
- Analiza tecnicamente la captura
- Evalua decision del usuario
- Si SL: identifica que se pudo filtrar
- SIEMPRE registra con log_trade`;

const PROMPT_GESTION = PROMPT_BASE + `

ROL GESTION: Gestionas cuentas prop firms. Lees capturas dashboards o entiendes texto.
- Captura dashboard: extrae datos, usa save_account_snapshot
- Si cuenta no existe: create_account primero
- Alertas: daily loss >70% ALERTA, trailing DD >80% CRITICO, consistencia >30% RIESGO`;

const PROMPT_BACKTESTING = PROMPT_BASE + `

ROL BACKTESTING v18: Backtest manual NQ Mar-Abr 2026.
Estado actual: 35 trades, +9865 USD, WR 53.3%. Asia debil (20%), NY fuerte (75%).
- Trade dictado: log_backtest_trade
- Stats: responde con numeros del contexto
- Sugiere patrones cuando los detectes`;

const PROMPTS_BY_KIND = { trading: PROMPT_TRADING, gestion: PROMPT_GESTION, backtesting: PROMPT_BACKTESTING };
const TOOLS_BY_KIND = { trading: TOOLS_TRADING, gestion: TOOLS_GESTION, backtesting: TOOLS_BACKTESTING };

/**
 * Llama a la API de Claude con reintentos automáticos en caso de 529 (overloaded).
 */
async function callClaudeWithRetry(params, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await claude.messages.create(params);
    } catch (err) {
      const isOverloaded = err.status === 529 || (err.message || '').includes('overloaded');
      const isLastAttempt = attempt === maxRetries - 1;
      if (!isOverloaded || isLastAttempt) throw err;
      const delay = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s
      console.log(`[Claude] Overloaded, reintentando en ${delay}ms (intento ${attempt + 1}/${maxRetries})...`);
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

    // Asegurar que SIEMPRE haya contenido textual (aunque solo se suba imagen)
    const userContentText = message || (req.file ? '(captura adjunta sin texto)' : '');

    await query(
      'INSERT INTO chat_messages (session_id, role, content, chat_kind, image_url) VALUES ($1, $2, $3, $4, $5)',
      [kind + '_main', 'user', userContentText, kind, req.file ? '[image attached]' : null]
    );

    // History con saneamiento: filtrar mensajes con contenido vacio
    const history = await query(
      `SELECT role, content FROM chat_messages
       WHERE chat_kind = $1 AND content IS NOT NULL AND content != ''
       ORDER BY created_at DESC LIMIT 15`,
      [kind]
    );
    const orderedHistory = history.rows.reverse();

    const sharedContext = await buildSharedContext(kind);

    // Construir mensajes para Claude (todos menos el ultimo, que reconstruimos abajo)
    const messages = orderedHistory.slice(0, -1)
      .filter((m) => m.content && m.content.trim().length > 0)
      .map((m) => ({ role: m.role, content: m.content }));

    // Ultimo mensaje del usuario (con imagen si aplica)
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

    while (safetyCounter < 5) {
      safetyCounter++;
      response = await callClaudeWithRetry({
        model: CLAUDE_MODEL,
        max_tokens: 1500,
        system: systemPrompt,
        tools: TOOLS_BY_KIND[kind],
        messages
      });
      if (response.stop_reason !== 'tool_use') break;

      const toolUseBlocks = response.content.filter((c) => c.type === 'tool_use');
      messages.push({ role: 'assistant', content: response.content });
      const toolResults = [];
      for (const tu of toolUseBlocks) {
        const result = await executeTool(tu.name, tu.input);
        accumulatedToolCalls.push({ name: tu.name, input: tu.input, result });
        toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(result) });
      }
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
    // Mensajes de error más claros para el usuario
    let userMsg = err.message;
    if (err.status === 529) userMsg = 'Servidores de Claude sobrecargados. Reintenta en 1 minuto.';
    if (err.status === 429) userMsg = 'Límite de uso alcanzado. Espera 1 minuto.';
    if (err.status === 401) userMsg = 'API key inválida. Revisa ANTHROPIC_API_KEY en Railway.';
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

// Mini chat especifico de una cuenta (se anyade despues del export default)
