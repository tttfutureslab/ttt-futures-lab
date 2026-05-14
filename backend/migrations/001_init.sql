-- TTT FUTURES LAB · Schema inicial
-- Ejecutar una vez en Railway PostgreSQL al desplegar

-- ═══════════════════════════════════════════════════════════
-- PROP FIRMS: catálogo de firms soportadas
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS prop_firms (
  id          SERIAL PRIMARY KEY,
  slug        VARCHAR(50) UNIQUE NOT NULL,        -- 'tradeify', 'topone', 'mffu'
  name        VARCHAR(100) NOT NULL,
  website     VARCHAR(200),
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT NOW()
);

INSERT INTO prop_firms (slug, name, website) VALUES
  ('topone',   'TopOne Futures',     'https://toponefutures.com'),
  ('tradeify', 'Tradeify',           'https://tradeify.co'),
  ('mffu',     'MyFundedFutures',    'https://myfundedfutures.com')
ON CONFLICT (slug) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- ACCOUNTS: tus cuentas en cada prop firm
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS accounts (
  id             SERIAL PRIMARY KEY,
  prop_firm_id   INT REFERENCES prop_firms(id),
  account_label  VARCHAR(100) NOT NULL,           -- ej "TopOne 50K #1"
  account_type   VARCHAR(50),                     -- 'evaluation', 'funded', 'sim_funded'
  size_usd       NUMERIC(12,2),                   -- ej 50000
  daily_loss     NUMERIC(12,2),                   -- ej -1500
  trailing_dd    NUMERIC(12,2),                   -- ej -2500
  profit_target  NUMERIC(12,2),                   -- ej 3000 (eval only)
  consistency_pct NUMERIC(5,2),                   -- ej 30 (% max best day)
  status         VARCHAR(30) DEFAULT 'active',    -- active, paused, blown, passed
  notes          TEXT,
  created_at     TIMESTAMP DEFAULT NOW(),
  updated_at     TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
-- SNAPSHOTS: foto del estado de cada cuenta cada vez que subes screenshot
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS snapshots (
  id               SERIAL PRIMARY KEY,
  account_id       INT REFERENCES accounts(id) ON DELETE CASCADE,
  snapshot_at      TIMESTAMP DEFAULT NOW(),
  balance          NUMERIC(12,2),
  equity           NUMERIC(12,2),
  pnl_today        NUMERIC(12,2),
  pnl_total        NUMERIC(12,2),
  trailing_dd_now  NUMERIC(12,2),                 -- distancia actual al DD
  best_day_pnl     NUMERIC(12,2),                 -- mejor día (para consistencia)
  trading_days     INT,
  raw_vision_data  JSONB,                         -- todo lo que Claude leyó
  screenshot_url   TEXT,                          -- URL de la imagen guardada
  notes            TEXT
);

CREATE INDEX IF NOT EXISTS idx_snapshots_account_date ON snapshots(account_id, snapshot_at DESC);

-- ═══════════════════════════════════════════════════════════
-- RULES: normas de cada prop firm (actualizado por cron diario)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS rules (
  id            SERIAL PRIMARY KEY,
  prop_firm_id  INT REFERENCES prop_firms(id),
  category      VARCHAR(50),                      -- 'drawdown', 'payout', 'consistency', 'scaling'
  rule_key      VARCHAR(100),                     -- 'daily_loss_50k', 'min_trading_days'
  rule_value    TEXT,
  source_url    VARCHAR(500),
  effective_from TIMESTAMP DEFAULT NOW(),
  is_current    BOOLEAN DEFAULT TRUE,
  fetched_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rules_firm_current ON rules(prop_firm_id, is_current);

-- ═══════════════════════════════════════════════════════════
-- RULE_CHANGES: log de cambios detectados por el cron diario
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS rule_changes (
  id            SERIAL PRIMARY KEY,
  prop_firm_id  INT REFERENCES prop_firms(id),
  rule_key      VARCHAR(100),
  old_value     TEXT,
  new_value     TEXT,
  detected_at   TIMESTAMP DEFAULT NOW(),
  notified      BOOLEAN DEFAULT FALSE
);

-- ═══════════════════════════════════════════════════════════
-- CHAT_MESSAGES: historial de conversaciones con Claude
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS chat_messages (
  id          SERIAL PRIMARY KEY,
  session_id  VARCHAR(100),                       -- agrupa conversaciones
  role        VARCHAR(20),                        -- 'user' | 'assistant'
  content     TEXT,
  metadata    JSONB,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_session ON chat_messages(session_id, created_at);
