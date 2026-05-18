import { Router } from 'express';
import multer from 'multer';
import { claude, CLAUDE_MODEL } from '../services/claude.js';
import { query } from '../db/pool.js';
import { buildSharedContext } from '../services/sharedContext.js';
import { TOOLS_TRADING, TOOLS_GESTION, TOOLS_BACKTESTING, executeTool } from '../services/tools.js';
import { PROMPT_TRADING, PROMPT_GESTION, PROMPT_BACKTESTING } from '../services/prompts.js';
import { PROMPT_BACKTESTING_LIGHT } from '../services/prompts-backtest.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const WEB_SEARCH_TOOL = { type: 'web_search_20250305', name: 'web_search' };
const ALL_TOOLS = [...TOOLS_TRADING, ...TOOLS_GESTION, ...TOOLS_BACKTESTING, WEB_SEARCH_TOOL];

const PROMPTS_BY_KIND = {
  trading: PROMPT_TRADING,
  gestion: PROMPT_GESTION,
  backtesting: PROMPT_BACKTESTING_LIGHT
};

const THINKING_CONFIG = {
  trading:     { enabled: false, budget: 0 },
  gestion:     { enabled: false, budget: 0 },
  backtesting: { enabled: false, budget: 0 }
};

const HISTORY_LIMIT = { trading: 10, gestion: 10, backtesting: 8 };
const MAX_TOKENS = { trading: 1500, gestion: 1500, backtesting: 1500 };

async function callClaudeWithRetry(params, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await claude.messages.create(params);
    } catch (err) {
      const status = err.status;
      const isOverloaded = status === 529 || (err.message || '').includes('overloaded');
      const isRateLimit = status === 429;
      const isLastAttempt = attempt === maxRetries - 1;

      if (isRateLimit) {
        const retryAfter = parseInt(err.headers?.['retry-after']) || 30;
        if (isLastAttempt) {
          err.userMessage = 'Rate limit. Espera ' + retryAfter + 's.';
          throw err;
        }
        console.log('[Claude] 429 retry-after ' + retryAfter + 's');
        await new Promise((r) => setTimeout(r, retryAfter * 1000));
        continue;
      }

      if (isOverloaded && !isLastAttempt) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
        continue;
      }
      throw err;
    }
  }
}

/**
 * POST /api/chat/:kind/message
 * Para chats con trader: ?trader=adri o ?trader=juanka
 * Para chat backtest (compartido): sin parametro trader
 */
router.post('/:kind/message', upload.single('image'), async (req, res) => {
  try {
    const kind = req.params.kind;
    if (!['trading', 'gestion', 'backtesting'].includes(kind)) {
      return res.status(400).json({ error: 'Tipo de chat invalido' });
    }

    // trader_slug: query param o body, solo aplica a trading/gestion
    const traderSlug = (kind === 'backtesting') ? null
      : (req.query.trader || req.body.trader_slug || 'adri');

    if (traderSlug && !['adri', 'juanka'].includes(traderSlug)) {
      return res.status(400).json({ error: 'Trader invalido' });
    }

    const message = (req.body.message || '').trim();
    if (!message && !req.file) return res.status(400).json({ error: 'Mensaje vacio' });

    const userContentText = message || (req.file ? '(captura)' : '');

    // session_id incluye trader para separar conversaciones
    const sessionId = kind === 'backtesting' ? 'backtesting_main' : (kind + '_' + traderSlug);

    await query(
      'INSERT INTO chat_messages (session_id, role, content, chat_kind, trader_slug, image_url) VALUES ($1, $2, $3, $4, $5, $6)',
      [sessionId, 'user', userContentText, kind, traderSlug, req.file ? '[img]' : null]
    );

    // History filtrado por chat_kind + trader_slug
    let historySql = 'SELECT role, content FROM chat_messages WHERE chat_kind = $1 AND content IS NOT NULL AND content != $2';
    const historyParams = [kind, ''];
    if (traderSlug) {
      historySql += ' AND trader_slug = $3';
      historyParams.push(traderSlug);
    }
    historySql += ' ORDER BY created_at DESC LIMIT ' + HISTORY_LIMIT[kind];
    const history = await query(historySql, historyParams);
    const orderedHistory = history.rows.reverse();

    const sharedContext = await buildSharedContext(kind, traderSlug);

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

    // Prompt enriquecido: indicar a Claude el trader actual
    let systemPrompt = PROMPTS_BY_KIND[kind];
    if (traderSlug) {
      const traderName = traderSlug.toUpperCase();
      systemPrompt = systemPrompt.replace(/ALADIN/g, traderName) +
        '\n\nESTE CHAT PERTENECE AL TRADER: ' + traderName +
        '. Todas las operaciones (log_trade, create_account, etc) deben asignarse a este trader pasando trader_slug="' + traderSlug + '".';
    }
    systemPrompt += '\n\nCONTEXTO:\n' + JSON.stringify(sharedContext);

    let response;
    const accumulatedToolCalls = [];
    let safetyCounter = 0;
    const MAX_LOOPS = 15;

    while (safetyCounter < MAX_LOOPS) {
      safetyCounter++;

      const apiParams = {
        model: MODEL_BY_KIND[kind] || CLAUDE_MODEL,
        max_tokens: MAX_TOKENS[kind],
        system: systemPrompt,
        tools: ALL_TOOLS,
        messages
      };

      if (THINKING_CONFIG[kind].enabled) {
        apiParams.thinking = { type: 'enabled', budget_tokens: THINKING_CONFIG[kind].budget };
      }

      response = await callClaudeWithRetry(apiParams);
      console.log('[' + kind + (traderSlug ? '/' + traderSlug : '') + '] L' + safetyCounter +
        ' stop=' + response.stop_reason +
        ' in=' + response.usage?.input_tokens +
        ' out=' + response.usage?.output_tokens);

      if (response.stop_reason !== 'tool_use') break;

      const toolUseBlocks = response.content.filter((c) => c.type === 'tool_use');
      messages.push({ role: 'assistant', content: response.content });

      const toolResults = [];
      let executedSomething = false;

      for (const tu of toolUseBlocks) {
        if (tu.name === 'web_search') {
          accumulatedToolCalls.push({ name: 'web_search', input: tu.input, result: { managed_by: 'anthropic' } });
          executedSomething = true;
          continue;
        }
        // Inyectar trader_slug automaticamente si no esta presente y aplica
        const toolInput = { ...tu.input };
        if (traderSlug && ['log_trade', 'create_account'].includes(tu.name) && !toolInput.trader_slug) {
          toolInput.trader_slug = traderSlug;
        }
        const result = await executeTool(tu.name, toolInput);
        console.log('[' + kind + '] tool ' + tu.name);
        accumulatedToolCalls.push({ name: tu.name, input: toolInput, result });
        toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(result) });
        executedSomething = true;
      }

      if (toolResults.length > 0) {
        messages.push({ role: 'user', content: toolResults });
      }
      if (!executedSomething) break;
    }

    const assistantText = response.content
      .filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('\n') || '(Respuesta vacia)';

    await query(
      'INSERT INTO chat_messages (session_id, role, content, chat_kind, trader_slug, tool_calls) VALUES ($1, $2, $3, $4, $5, $6)',
      [sessionId, 'assistant', assistantText, kind, traderSlug, accumulatedToolCalls.length ? JSON.stringify(accumulatedToolCalls) : null]
    );

    res.json({ message: assistantText, tool_calls: accumulatedToolCalls });
  } catch (err) {
    console.error('Chat ' + req.params.kind + ' error:', err.message);
    let userMsg = err.userMessage || err.message;
    if (err.status === 529) userMsg = 'Servidores Claude sobrecargados. Reintenta.';
    if (err.status === 429 && !err.userMessage) {
      const retryAfter = parseInt(err.headers?.['retry-after']) || 60;
      userMsg = 'Limite. Espera ' + retryAfter + 's.';
    }
    if (err.status === 401) userMsg = 'API key invalida.';
    res.status(err.status || 500).json({ error: userMsg });
  }
});

router.get('/:kind/history', async (req, res) => {
  try {
    const kind = req.params.kind;
    const traderSlug = kind === 'backtesting' ? null : (req.query.trader || 'adri');

    let sql = 'SELECT role, content, created_at, image_url FROM chat_messages WHERE chat_kind = $1';
    const params = [kind];
    if (traderSlug) {
      sql += ' AND trader_slug = $2';
      params.push(traderSlug);
    }
    sql += ' ORDER BY created_at ASC LIMIT 200';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:kind/history', async (req, res) => {
  try {
    const kind = req.params.kind;
    const traderSlug = kind === 'backtesting' ? null : (req.query.trader || 'adri');

    let sql = 'DELETE FROM chat_messages WHERE chat_kind = $1';
    const params = [kind];
    if (traderSlug) {
      sql += ' AND trader_slug = $2';
      params.push(traderSlug);
    }
    await query(sql, params);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
