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

    const prompt = `Analiza estas estadisticas de trading real (NQ futures, estrategia v18, R:R 3:1).
Da 3-5 insights muy concretos y accionables. Identifica:
- Sesion mas rentable y por que
- Sesion mas debil y como mejorarla o evitarla
- Patron sesion-cuarto que destaque
- Dia de la semana mas/menos productivo
- Recomendaciones concretas para mejorar resultados

Responde en formato bullet points en espanol, directo y tecnico. Maximo 250 palabras.

DATOS:
${JSON.stringify(stats, null, 2)}`;

    const response = await claude.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 800,
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

  return {
    totals: totals.rows[0],
    by_session: bySession.rows,
    by_session_quarter: bySessionQuarter.rows,
    by_weekday: byWeekday.rows
  };
}

export default router;
