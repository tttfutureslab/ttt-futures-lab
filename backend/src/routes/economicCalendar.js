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

export default router;
