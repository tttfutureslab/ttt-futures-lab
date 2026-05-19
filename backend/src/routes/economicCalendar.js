import { Router } from 'express';
import { fetchAndCacheEvents, getCachedEvents, getLastFetchInfo } from '../services/economicCalendar.js';

const router = Router();

// GET /api/economic-calendar
// Devuelve eventos cacheados (USA High/Medium próximos 7 días)
router.get('/', async (req, res) => {
  try {
    const events = await getCachedEvents();
    const lastFetch = await getLastFetchInfo();
    res.json({
      events,
      last_fetch: lastFetch,
      count: events.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/economic-calendar/refresh
// Fuerza una descarga manual (cuidado con el rate limit)
router.post('/refresh', async (req, res) => {
  try {
    const result = await fetchAndCacheEvents();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// GET /api/economic-calendar/upcoming?minutes=60
// Devuelve noticias HIGH IMPACT próximas dentro de N minutos (default 60)
router.get('/upcoming', async (req, res) => {
  try {
    const minutes = Math.min(parseInt(req.query.minutes) || 60, 240);
    const { query } = await import('../db/pool.js');
    const result = await query(`
      SELECT id, event_title, country, impact, event_at, forecast, previous, actual,
             EXTRACT(EPOCH FROM (event_at - NOW()))::int AS seconds_until
      FROM economic_events
      WHERE country = 'USD'
        AND impact = 'High'
        AND event_at >= NOW()
        AND event_at <= NOW() + INTERVAL '${minutes} minutes'
      ORDER BY event_at ASC
    `);
    res.json({ events: result.rows, count: result.rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
