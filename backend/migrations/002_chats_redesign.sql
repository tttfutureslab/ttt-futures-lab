-- TTT FUTURES LAB · Migración 002
-- Tres chats especializados con memoria compartida

CREATE TABLE IF NOT EXISTS trades (
  id              SERIAL PRIMARY KEY,
  account_id      INT REFERENCES accounts(id) ON DELETE SET NULL,
  trade_at        TIMESTAMP DEFAULT NOW(),
  asset           VARCHAR(20),
  direction       VARCHAR(10),
  contracts       NUMERIC(8,2),
  entry_price     NUMERIC(12,2),
  exit_price      NUMERIC(12,2),
  result          VARCHAR(20),
  pnl_usd         NUMERIC(12,2),
  session         VARCHAR(20),
  quarter         VARCHAR(10),
  ict_setup       TEXT,
  rules_checked   JSONB,
  reason          TEXT,
  claude_analysis TEXT,
  screenshot_url  TEXT,
  notes           TEXT
);
CREATE INDEX IF NOT EXISTS idx_trades_date ON trades(trade_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_account ON trades(account_id, trade_at DESC);

CREATE TABLE IF NOT EXISTS backtest_trades (
  id           SERIAL PRIMARY KEY,
  trade_number INT UNIQUE,
  trade_date   DATE,
  week         INT,
  session      VARCHAR(20),
  quarter      VARCHAR(10),
  direction    VARCHAR(10),
  result       VARCHAR(20),
  pnl_usd      NUMERIC(10,2),
  notes        TEXT,
  created_at   TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_backtest_number ON backtest_trades(trade_number);

ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS chat_kind VARCHAR(20) DEFAULT 'general';
CREATE INDEX IF NOT EXISTS idx_chat_kind ON chat_messages(chat_kind, created_at DESC);
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS tool_calls JSONB;

INSERT INTO backtest_trades (trade_number, trade_date, week, session, quarter, direction, result, pnl_usd, notes) VALUES
  (1,  '2026-03-02', 1, 'Asia',    'Q3', 'short', 'SL',     -250, 'Misidentificacion cuarto distribucion'),
  (2,  '2026-03-02', 1, 'London',  'Q4', 'long',  'TP',      750, 'XAMD completo'),
  (3,  '2026-03-02', 1, 'NY AM',   'Q3', 'short', 'TP',      750, 'CISD HTF claro'),
  (4,  '2026-03-03', 1, 'Asia',    'Q3', 'long',  'SL',     -250, 'Asia debil'),
  (5,  '2026-03-03', 1, 'London',  'Q4', 'short', 'SL',     -250, 'Wrong direction'),
  (6,  '2026-03-03', 1, 'NY AM',   'Q4', 'long',  'TP',      750, 'Setup limpio'),
  (7,  '2026-03-03', 1, 'NY PM',   'Q3', 'short', 'partial', 400, 'Cierre por market close'),
  (8,  '2026-03-04', 1, 'Asia',    'Q3', 'long',  'SL',     -250, 'Asia erratica'),
  (9,  '2026-03-04', 1, 'London',  'Q3', 'short', 'TP',      750, 'XAMD bear'),
  (10, '2026-03-04', 1, 'NY AM',   'Q4', 'long',  'TP',      750, ''),
  (11, '2026-03-05', 1, 'Asia',    'Q3', 'short', 'SL',     -250, 'Misidentificacion'),
  (12, '2026-03-05', 1, 'London',  'Q3', 'long',  'SL',     -250, 'Sin XAMD confirmado'),
  (13, '2026-03-05', 1, 'NY AM',   'Q4', 'long',  'TP',      750, 'Reglas limpias'),
  (14, '2026-03-06', 1, 'Asia',    'Q4', 'long',  'SL',     -250, ''),
  (15, '2026-03-06', 1, 'London',  'Q4', 'short', 'SL',     -250, 'Entrada precipitada'),
  (16, '2026-03-06', 1, 'NY PM',   'Q3', 'long',  'TP',      750, 'TP lucky, no replicable'),
  (17, '2026-03-09', 2, 'Asia',    'Q3', 'long',  'SL',     -250, 'Asia weak'),
  (18, '2026-03-09', 2, 'London',  'Q4', 'short', 'TP',      750, 'Q4 XAMD bull reversal'),
  (19, '2026-03-09', 2, 'NY AM',   'Q3', 'long',  'TP',      750, 'CISD HTF + IRL'),
  (20, '2026-03-09', 2, 'NY PM',   'Q4', 'long',  'partial', 350, 'Partial por close'),
  (21, '2026-03-10', 2, 'Asia',    'Q4', 'short', 'BE',        0, 'BE tras movimiento'),
  (22, '2026-03-10', 2, 'London',  'Q3', 'long',  'TP',      750, ''),
  (23, '2026-03-10', 2, 'NY AM',   'Q3', 'short', 'TP',      750, 'Setup A+ clean'),
  (24, '2026-03-10', 2, 'NY PM',   'Q4', 'short', 'TP',      750, ''),
  (25, '2026-03-11', 2, 'Asia',    'Q3', 'short', 'SL',     -250, 'Asia distribucion erronea'),
  (26, '2026-03-11', 2, 'London',  'Q4', 'long',  'SL',     -250, 'Sin liquidez tomada'),
  (27, '2026-03-11', 2, 'NY AM',   'Q4', 'long',  'TP',      750, ''),
  (28, '2026-03-11', 2, 'NY PM',   'Q3', 'short', 'partial', 380, 'Partial cierre sesion'),
  (29, '2026-03-12', 2, 'Asia',    'Q3', 'long',  'SL',     -250, 'Misidentificacion quarter'),
  (30, '2026-03-12', 2, 'Asia',    'Q4', 'short', 'SL',     -250, 'Sin patron XAMD/AMDX'),
  (31, '2026-03-12', 2, 'London',  'Q3', 'short', 'TP',      750, 'XAMD bear valido'),
  (32, '2026-03-12', 2, 'London',  'Q4', 'long',  'SL',     -250, 'Wrong direction'),
  (33, '2026-03-12', 2, 'NY AM',   'Q4', 'long',  'SL',     -250, 'Entrada sin confirmacion'),
  (34, '2026-03-12', 2, 'NY AM',   'Q3', 'short', 'TP',      750, 'Clean ICT'),
  (35, '2026-03-12', 2, 'NY PM',   'Q4', 'short', 'TP',      750, '')
ON CONFLICT (trade_number) DO NOTHING;
