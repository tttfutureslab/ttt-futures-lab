-- Tabla de tipos de cuenta por prop firm
CREATE TABLE IF NOT EXISTS account_types (
  id SERIAL PRIMARY KEY,
  prop_firm_id INTEGER REFERENCES prop_firms(id),
  type_name VARCHAR(80) NOT NULL,
  display_name VARCHAR(80) NOT NULL,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(prop_firm_id, type_name)
);

-- Seed: tipos por prop firm
INSERT INTO account_types (prop_firm_id, type_name, display_name) VALUES
  ((SELECT id FROM prop_firms WHERE slug='topone'),   'elite_daily',     'Elite Daily'),
  ((SELECT id FROM prop_firms WHERE slug='topone'),   'elite_access',    'Elite Access'),
  ((SELECT id FROM prop_firms WHERE slug='topone'),   'elite_static',    'Elite Static'),
  ((SELECT id FROM prop_firms WHERE slug='tradeify'), 'growth',          'Growth'),
  ((SELECT id FROM prop_firms WHERE slug='tradeify'), 'select',          'Select'),
  ((SELECT id FROM prop_firms WHERE slug='mffu'),     'flex',            'Flex'),
  ((SELECT id FROM prop_firms WHERE slug='mffu'),     'starter',         'Starter'),
  ((SELECT id FROM prop_firms WHERE slug='mffu'),     'expert',          'Expert')
ON CONFLICT (prop_firm_id, type_name) DO NOTHING;

-- Añadir columnas a accounts: tipo de cuenta, fase (funded/challenge), numero externo
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS account_type_name VARCHAR(80);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS phase VARCHAR(20) DEFAULT 'challenge';
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS external_account_number VARCHAR(50);
