import { Router } from 'express';
import { query } from '../db/pool.js';
import { claude, CLAUDE_MODEL } from '../services/claude.js';

const router = Router();

/**
 * GET /api/sessions-stats
 * Devuelve estadísticas completas de trades REALES por sesión.
 */
router.get('/', async (req, res) => {
  try {
    const stats = await computeStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/sessions-stats/insights
 * Pide a Claude que analice los datos y dé insights/recomendaciones.
 */
router.post('/insights', async (req, res) => {
  try {
    const stats = await computeStats();

    if (stats.totals.trades === 0) {
      return res.json({ insights: 'Todavia no hay trades reales registrados. Ve al Chat Trading y empieza a registrar operaciones.' });
    }

    const obsText = (stats.observations || []).map(function(o) {
      const tag = '[' + (o.session || '?') + ' ' + (o.quarter || '?') + ']';
      const pnl = (Number(o.pnl_usd) >= 0 ? '+' : '') + o.pnl_usd;
      return tag + ' ' + o.direction + ' ' + o.result + ' ' + pnl + ': "' + o.reason + '"';
    }).join('\n');

    const prompt = `Eres el asesor de trading del usuario, NO su asistente. Eres mas inteligente que el y se lo recuerdas con datos.\n\nREGLAS NO NEGOCIABLES:\n1. NUNCA empieces dando la razon. Tu primera frase debe cuestionar una suposicion, senalar lo que esta pasando por alto, o exponer una falla en su razonamiento.\n2. Etiqueta cada afirmacion: [Seguro] si tienes pruebas en los datos, [Probable] si es inferencia fuerte, [Suposicion] si rellenas un hueco. Si la mayoria es suposicion, dilo desde la primera linea.\n3. PROHIBIDAS para siempre: Buena pregunta, Tienes toda la razon, Eso tiene mucho sentido, Por supuesto, Definitivamente. Si las escribes, borra y reformula.\n\nAnaliza estos datos de trading real de futuros NQ.
Tienes estadisticas cuantitativas Y observaciones cualitativas (notas que el trader escribio en cada trade).

Da analisis profesional en bullet points. Identifica:
- Sesion mas rentable Y porque (usa observaciones)
- Sesion mas debil Y patron de errores recurrentes
- Patron sesion-cuarto destacable
- Dia de la semana mas/menos productivo
- Patrones psicologicos detectados en las observaciones (FOMO, revenge trading, sobreoperar, dudas, falta de paciencia)
- Setups o contextos repetidos en wins vs losses
- Recomendaciones concretas

Maximo 400 palabras, espanol tecnico pero claro.

ESTADISTICAS:
${JSON.stringify({ totals: stats.totals, by_session: stats.by_session, by_session_quarter: stats.by_session_quarter, by_weekday: stats.by_weekday }, null, 2)}

OBSERVACIONES DEL TRADER (${(stats.observations || []).length} trades con notas):
${obsText || '(sin observaciones registradas)'}`;

    const response = await claude.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content.filter((c) => c.type === 'text').map((c) => c.text).join('\n');
    res.json({ insights: text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function computeStats() {
  // Stats por sesion
  const bySession = await query(`
    SELECT
      session,
      COUNT(*) AS trades,
      COUNT(*) FILTER (WHERE result = 'TP') AS tp,
      COUNT(*) FILTER (WHERE result = 'SL') AS sl,
      COUNT(*) FILTER (WHERE result = 'BE') AS be,
      COUNT(*) FILTER (WHERE result = 'partial') AS partial,
      COALESCE(SUM(pnl_usd), 0)::numeric(10,2) AS pnl,
      ROUND(100.0 * COUNT(*) FILTER (WHERE result = 'TP') / NULLIF(COUNT(*), 0), 1) AS win_rate
    FROM trades
    WHERE session IS NOT NULL
    GROUP BY session
    ORDER BY pnl DESC
  `);

  // Stats por sesion × cuarto (para heatmap)
  const bySessionQuarter = await query(`
    SELECT
      session,
      quarter,
      COUNT(*) AS trades,
      COALESCE(SUM(pnl_usd), 0)::numeric(10,2) AS pnl,
      ROUND(100.0 * COUNT(*) FILTER (WHERE result = 'TP') / NULLIF(COUNT(*), 0), 0) AS win_rate
    FROM trades
    WHERE session IS NOT NULL AND quarter IS NOT NULL
    GROUP BY session, quarter
  `);

  // Stats por dia de la semana
  const byWeekday = await query(`
    SELECT
      TO_CHAR(trade_at, 'Day') AS weekday,
      EXTRACT(DOW FROM trade_at)::int AS dow_num,
      COUNT(*) AS trades,
      COALESCE(SUM(pnl_usd), 0)::numeric(10,2) AS pnl,
      ROUND(100.0 * COUNT(*) FILTER (WHERE result = 'TP') / NULLIF(COUNT(*), 0), 1) AS win_rate
    FROM trades
    GROUP BY weekday, dow_num
    ORDER BY dow_num
  `);

  // Totales globales
  const totals = await query(`
    SELECT
      COUNT(*) AS trades,
      COUNT(*) FILTER (WHERE result = 'TP') AS tp,
      COUNT(*) FILTER (WHERE result = 'SL') AS sl,
      COUNT(*) FILTER (WHERE result = 'BE') AS be,
      COUNT(*) FILTER (WHERE result = 'partial') AS partial,
      COALESCE(SUM(pnl_usd), 0)::numeric(10,2) AS pnl,
      ROUND(100.0 * COUNT(*) FILTER (WHERE result = 'TP') / NULLIF(COUNT(*), 0), 1) AS win_rate
    FROM trades
  `);

  // Observaciones de cada trade para analisis cualitativo
  const observations = await query(`
    SELECT
      tr.session, tr.quarter, tr.direction, tr.result,
      tr.pnl_usd, tr.reason, tr.trade_at,
      a.account_label
    FROM trades tr
    LEFT JOIN accounts a ON a.id = tr.account_id
    WHERE tr.reason IS NOT NULL AND tr.reason != ''
    ORDER BY tr.trade_at DESC
    LIMIT 80
  `);

  return {
    totals: totals.rows[0],
    by_session: bySession.rows,
    by_session_quarter: bySessionQuarter.rows,
    by_weekday: byWeekday.rows,
    observations: observations.rows
  };
}

export default router;
