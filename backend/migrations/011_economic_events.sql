-- ═══════════════════════════════════════════════════════════
-- Migración 011: Cache de eventos económicos (Forex Factory)
-- ═══════════════════════════════════════════════════════════
-- Guarda eventos económicos descargados de Forex Factory.
-- Solo USA con impacto High o Medium.
-- Refresco diario por cron (no más, Forex Factory limita la API).
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS economic_events (
  id SERIAL PRIMARY KEY,
  external_id TEXT UNIQUE,                  -- hash o id único del evento
  event_title TEXT NOT NULL,
  country TEXT NOT NULL,                    -- 'USD', 'EUR', etc.
  impact TEXT NOT NULL,                     -- 'High', 'Medium', 'Low', 'Holiday'
  event_at TIMESTAMPTZ NOT NULL,            -- fecha y hora del evento (UTC)
  forecast TEXT,                            -- valor previsto (string porque puede ser "2.5%" o "200K")
  previous TEXT,                            -- valor anterior
  actual TEXT,                              -- valor real publicado (opcional, se actualiza después)
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT DEFAULT 'forex_factory'
);

CREATE INDEX IF NOT EXISTS idx_econ_events_date ON economic_events (event_at);
CREATE INDEX IF NOT EXISTS idx_econ_events_country ON economic_events (country, impact);

-- Tabla simple para tracking de la última descarga (evitar spam)
CREATE TABLE IF NOT EXISTS economic_fetch_log (
  id SERIAL PRIMARY KEY,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  events_count INTEGER,
  status TEXT,                              -- 'success' | 'rate_limited' | 'error'
  error_msg TEXT
);
