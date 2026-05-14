import { Router } from 'express';
import multer from 'multer';
import { claude, CLAUDE_MODEL } from '../services/claude.js';
import { query } from '../db/pool.js';
import { buildSharedContext } from '../services/sharedContext.js';
import { TOOLS_TRADING, TOOLS_GESTION, TOOLS_BACKTESTING, executeTool } from '../services/tools.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const PROMPT_BASE = `Eres el asistente de TTT Futures Lab, un laboratorio de trading de futuros NQ basado en metodologia ICT.

CONTEXTO DEL TRADER:
- Estrategia v18 manual: TP +750 USD / SL -250 USD / R:R 3:1
- Framework ICT: XAMD/AMDX, CISD (LTF y HTF), IRL/ERL, OTE, BPR, IFVG, Power of Three, Quarters (Q1-Q4)
- Sesiones: Asia, London, NY AM, NY PM
- Prop firms: TopOne Futures, Tradeify, MyFundedFutures

CHECKLIST v18 (6 normas):
1. Q3 o Q4 (cuarto de distribucion)
2. Direccion de tendencia actual
3. Retroceso OTE + ERL o IRL tomada
4. CISD formado (LTF)
5. BPR o IFVG presente
6. CISD en HTF

REGLAS:
- Habla en espanol, directo y tecnico
- Usa terminologia ICT con naturalidad
- Cuando uses una herramienta para guardar datos, confirma brevemente que guardaste
- Tienes acceso a TODO el contexto del trader, usalo`;

const PROMPT_TRADING = PROMPT_BASE + `

TU ROL - CHAT TRADING:
Analista ICT que valida trades reales en vivo. El usuario te pasa capturas y dice si fue TP/SL/BE/parcial y por que.

1. Analiza la captura tecnicamente
2. Evalua la decision del usuario
3. Si fue SL: identifica que se pudo filtrar
4. Si fue TP: confirma normas cumplidas
5. SIEMPRE registra con log_trade
6. Identifica patrones con el tiempo`;

const PROMPT_GESTION = PROMPT_BASE + `

TU ROL - CHAT GESTION:
Gestionas las cuentas en prop firms. Lees capturas de dashboards o entiendes datos por texto.

1. Captura de dashboard: extrae datos y usa save_account_snapshot
2. Texto: actualiza con save_account_snapshot
3. Si la cuenta no existe, crea con create_account primero
4. Alertas: daily loss >70% ALERTA, trailing DD >80% CRITICO, consistencia >30% riesgo
5. Conoces trades recientes, intagralos`;

const PROMPT_BACKTESTING = PROMPT_BASE + `

TU ROL - CHAT BACKTESTING v18:
Registro y analisis del backtest manual (Mar 1 - Abr 1, 2026, NQ).

Estado: 35 trades, +9865 USD, WR 53.3%
- Asia debil 20% WR
- NY AM/PM fuertes 75% WR
- Errores: misidentificacion cuarto, wrong direction, sin XAMD/AMDX

1. Trade nuevo dictado: usa log_backtest_trade
2. Pregunta de stats: analiza el contexto y responde con numeros
3. Sugiere insights al detectar patrones
4. Diferencia clean vs real win rate`;

const PROMPTS_BY_KIND = { trading: PROMPT_TRADING, gestion: PROMPT_GESTION, backtesting: PROMPT_BACKTESTING };
const TOOLS_BY_KIND = { trading: TOOLS_TRADING, gestion: TOOLS_GESTION, backtesting: TOOLS_BACKTESTING };

router.post('/:kind/message', upload.single('image'), async (req, res) => {
  try {
    const kind = req.params.kind;
    if (!['trading', 'gestion', 'backtesting'].includes(kind)) {
      return res.status(400).json({ error: 'Tipo de chat invalido' });
    }
    const message = req.body.message || '';
    if (!message && !req.file) return res.status(400).json({ error: 'Mensaje vacio' });

    await query(
      'INSERT INTO chat_messages (session_id, role, content, chat_kind, image_url) VALUES ($1, $2, $3, $4, $5)',
      [kind + '_main', 'user', message, kind, req.file ? '[image attached]' : null]
    );

    const history = await query(
      'SELECT role, content FROM chat_messages WHERE chat_kind = $1 ORDER BY created_at DESC LIMIT 30',
      [kind]
    );
    const orderedHistory = history.rows.reverse();
    const sharedContext = await buildSharedContext();

    const messages = orderedHistory.slice(0, -1).map((m) => ({ role: m.role, content: m.content }));
    const lastUserContent = [];
    if (req.file) {
      lastUserContent.push({
        type: 'image',
        source: { type: 'base64', media_type: req.file.mimetype, data: req.file.buffer.toString('base64') }
      });
    }
    lastUserContent.push({ type: 'text', text: message || 'Analiza esta captura.' });
    messages.push({ role: 'user', content: lastUserContent });

    const systemPrompt = PROMPTS_BY_KIND[kind] + '\n\n=== CONTEXTO COMPARTIDO ===\n' + JSON.stringify(sharedContext, null, 2);

    let response;
    const accumulatedToolCalls = [];
    let safetyCounter = 0;

    while (safetyCounter < 5) {
      safetyCounter++;
      response = await claude.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 2500,
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

    const assistantText = response.content.filter((c) => c.type === 'text').map((c) => c.text).join('\n');

    await query(
      'INSERT INTO chat_messages (session_id, role, content, chat_kind, tool_calls) VALUES ($1, $2, $3, $4, $5)',
      [kind + '_main', 'assistant', assistantText, kind, accumulatedToolCalls.length ? JSON.stringify(accumulatedToolCalls) : null]
    );

    res.json({ message: assistantText, tool_calls: accumulatedToolCalls });
  } catch (err) {
    console.error('Chat ' + req.params.kind + ' error:', err);
    res.status(500).json({ error: err.message });
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
