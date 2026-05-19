// ═══════════════════════════════════════════════════════════
// Servicio: descarga eventos económicos de Forex Factory
// ═══════════════════════════════════════════════════════════
// URL pública: https://nfs.faireconomy.media/ff_calendar_thisweek.json
// Límite: 2 descargas cada 5 min por IP → cacheamos 1 vez/día.
// Solo guardamos USA con impacto High o Medium.
// ═══════════════════════════════════════════════════════════

import { query } from '../db/pool.js';
import crypto from 'crypto';

const FF_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json';

/**
 * Descarga el JSON de Forex Factory y guarda en BD.
 * Hace UPSERT por external_id (hash) para evitar duplicados.
 */
export async function fetchAndCacheEvents() {
  const startedAt = new Date();
  let status = 'success';
  let errorMsg = null;
  let savedCount = 0;

  try {
    const response = await fetch(FF_URL, {
      headers: {
        'User-Agent': 'TTT-Futures-Lab/1.0 (economic-calendar-cache)',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const events = await response.json();

    if (!Array.isArray(events)) {
      throw new Error('Respuesta no es un array');
    }

    // Filtrar solo USA con impacto High o Medium
    const filtered = events.filter(e =>
      e.country === 'USD' &&
      (e.impact === 'High' || e.impact === 'Medium')
    );

    // Guardar cada evento (UPSERT por external_id)
    for (const e of filtered) {
      // Crear hash único basado en title + date para deduplicar
      const externalId = crypto
        .createHash('sha256')
        .update(`${e.title}|${e.date}|${e.country}`)
        .digest('hex')
        .slice(0, 32);

      await query(`
        INSERT INTO economic_events
          (external_id, event_title, country, impact, event_at, forecast, previous, actual, fetched_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        ON CONFLICT (external_id) DO UPDATE
        SET
          forecast = EXCLUDED.forecast,
          previous = EXCLUDED.previous,
          actual = COALESCE(EXCLUDED.actual, economic_events.actual),
          fetched_at = NOW()
      `, [
        externalId,
        e.title,
        e.country,
        e.impact,
        new Date(e.date),
        e.forecast || null,
        e.previous || null,
        e.actual || null
      ]);

      savedCount++;
    }

    console.log(`[economic-calendar] ✓ Guardados ${savedCount} eventos USA (High/Medium)`);
  } catch (err) {
    status = err.message.includes('429') || err.message.includes('Request Denied') ? 'rate_limited' : 'error';
    errorMsg = err.message;
    console.error(`[economic-calendar] ✗ Error:`, err.message);
  }

  // Loguear el intento
  await query(`
    INSERT INTO economic_fetch_log (events_count, status, error_msg)
    VALUES ($1, $2, $3)
  `, [savedCount, status, errorMsg]).catch(() => {});

  return { savedCount, status, errorMsg, durationMs: Date.now() - startedAt };
}

/**
 * Lee eventos cacheados de la BD, opcionalmente filtrados.
 */
export async function getCachedEvents({ daysAhead = 7, country = 'USD', impacts = ['High', 'Medium'] } = {}) {
  const result = await query(`
    SELECT id, event_title, country, impact, event_at, forecast, previous, actual, fetched_at
    FROM economic_events
    WHERE country = $1
      AND impact = ANY($2::text[])
      AND event_at >= NOW() - INTERVAL '1 day'
      AND event_at <= NOW() + INTERVAL '${daysAhead} days'
    ORDER BY event_at ASC
  `, [country, impacts]);

  return result.rows;
}

/**
 * Última info de descarga.
 */
export async function getLastFetchInfo() {
  const result = await query(`
    SELECT fetched_at, events_count, status, error_msg
    FROM economic_fetch_log
    ORDER BY id DESC LIMIT 1
  `);
  return result.rows[0] || null;
}
