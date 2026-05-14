import { Router } from 'express';
import { claude, CLAUDE_MODEL } from '../services/claude.js';
import { query } from '../db/pool.js';

const router = Router();

const SYSTEM_PROMPT = `Eres el asistente personal de TTT Futures Lab, un laboratorio de trading de futuros NQ basado en metodología ICT.

CONTEXTO DEL USUARIO:
- Trader operando con prop firms: TopOne Futures, Tradeify, MyFundedFutures
- Estrategia: v18 manual (TP +$750 / SL -$250 / R:R 3:1)
- Framework ICT: XAMD/AMDX, CISD (LTF y HTF), IRL/ERL, OTE, BPR, IFVG, Power of Three, Quarters (Q1-Q4)
- Sesiones: Asia, London, NY AM, NY PM
- Checklist v18 (6 normas):
  1. Q3 o Q4 (cuarto de distribución)
  2. Dirección de tendencia actual
  3. Retroceso OTE + ERL o IRL tomada
  4. CISD formado (LTF)
  5. BPR o IFVG presente
  6. CISD en HTF

TU ROL:
- Responder preguntas sobre normas vigentes de prop firms (drawdown, consistencia, payouts, scaling)
- Analizar capturas de trades con framework ICT
- Asesorar sobre gestión de cuentas: consistencia, daily loss, trailing drawdown
- Hablar en español por defecto
- Ser directo, técnico, sin rodeos
- Si te preguntan algo de normas que requiere info muy actual y no tienes contexto suficiente en la BD, dilo y sugiere refrescar normas.`;

router.post('/message', async (req, res) => {
  try {
    const { session_id, message, include_context = true } = req.body;
    if (!message) return res.status(400).json({ error: 'message es requerido' });

    const sid = session_id || `session_${Date.now()}`;

    // Guardar mensaje del usuario
    await query(
      'INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)',
      [sid, 'user', message]
    );

    // Recuperar histórico de la sesión
    const history = await query(
      'SELECT role, content FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC LIMIT 40',
      [sid]
    );

    // Contexto opcional: cuentas + normas
    let contextBlock = '';
    if (include_context) {
      const accounts = await query(`
        SELECT a.account_label, pf.name AS firm, a.size_usd, a.status,
          (SELECT row_to_json(s) FROM (
            SELECT balance, pnl_today, pnl_total, trailing_dd_now, best_day_pnl
            FROM snapshots WHERE account_id = a.id ORDER BY snapshot_at DESC LIMIT 1
          ) s) AS last
        FROM accounts a JOIN prop_firms pf ON pf.id = a.prop_firm_id
        WHERE a.status = 'active'
      `);

      const rules = await query(`
        SELECT pf.slug, r.category, r.rule_key, r.rule_value
        FROM rules r JOIN prop_firms pf ON pf.id = r.prop_firm_id
        WHERE r.is_current = TRUE
      `);

      if (accounts.rows.length > 0 || rules.rows.length > 0) {
        contextBlock = `\n\nESTADO ACTUAL DE TUS CUENTAS:\n${JSON.stringify(accounts.rows, null, 2)}\n\nNORMAS VIGENTES:\n${JSON.stringify(rules.rows, null, 2)}`;
      }
    }

    const messages = history.rows.map((m) => ({ role: m.role, content: m.content }));

    const response = await claude.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2000,
      system: SYSTEM_PROMPT + contextBlock,
      messages
    });

    const assistantText = response.content
      .filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('');

    // Guardar respuesta
    await query(
      'INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)',
      [sid, 'assistant', assistantText]
    );

    res.json({ session_id: sid, message: assistantText });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Historial de una sesión
router.get('/session/:sid', async (req, res) => {
  const result = await query(
    'SELECT role, content, created_at FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC',
    [req.params.sid]
  );
  res.json(result.rows);
});

// Listar sesiones
router.get('/sessions', async (req, res) => {
  const result = await query(`
    SELECT session_id, MAX(created_at) AS last_at, COUNT(*) AS msg_count
    FROM chat_messages GROUP BY session_id ORDER BY last_at DESC LIMIT 50
  `);
  res.json(result.rows);
});

export default router;
