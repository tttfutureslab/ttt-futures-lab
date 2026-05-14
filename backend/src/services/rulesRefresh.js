import cron from 'node-cron';
import { claude, CLAUDE_MODEL } from './claude.js';
import { query } from '../db/pool.js';

const RULES_SYSTEM_PROMPT = `Eres un investigador especializado en normas de prop firms de futuros.

Tu tarea: para cada prop firm, buscar la información oficial y actualizada en su web y devolver un JSON con las normas vigentes.

Devuelve SOLO JSON, sin markdown:

{
  "firms": [
    {
      "slug": "topone",
      "rules": [
        {"category": "drawdown", "rule_key": "trailing_dd_50k", "rule_value": "2500"},
        {"category": "drawdown", "rule_key": "daily_loss_50k", "rule_value": "1250"},
        {"category": "consistency", "rule_key": "max_best_day_pct", "rule_value": "30"},
        {"category": "payout", "rule_key": "min_trading_days", "rule_value": "5"},
        ...
      ]
    },
    ...
  ]
}

Investiga: drawdown (trailing y daily) por tamaño de cuenta, regla de consistencia, días mínimos de trading, requisitos de payout, scaling.`;

/**
 * Ejecuta una búsqueda con Claude (web_search habilitado) para refrescar normas.
 */
export async function refreshRules() {
  console.log('🔄 [Rules] Iniciando refresh diario de normas...');

  const firms = await query("SELECT id, slug, name, website FROM prop_firms WHERE active = TRUE");

  const prompt = `Busca en sus webs oficiales las normas actuales de:
${firms.rows.map((f) => `- ${f.name} (${f.website})`).join('\n')}

Para cada una, devuelve las normas en el JSON especificado.`;

  const response = await claude.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4000,
    system: RULES_SYSTEM_PROMPT,
    tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    messages: [{ role: 'user', content: prompt }]
  });

  const text = response.content
    .filter((c) => c.type === 'text')
    .map((c) => c.text)
    .join('');

  const clean = text.replace(/```json\s*|\s*```/g, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(clean);
  } catch (err) {
    console.error('[Rules] No se pudo parsear JSON:', text.slice(0, 500));
    return { ok: false, error: 'parse_error' };
  }

  let changes = 0;
  for (const firm of parsed.firms) {
    const firmRow = firms.rows.find((f) => f.slug === firm.slug);
    if (!firmRow) continue;

    for (const rule of firm.rules) {
      // Buscar regla actual
      const existing = await query(
        'SELECT id, rule_value FROM rules WHERE prop_firm_id = $1 AND rule_key = $2 AND is_current = TRUE',
        [firmRow.id, rule.rule_key]
      );

      if (existing.rows.length === 0) {
        // Nueva regla
        await query(
          'INSERT INTO rules (prop_firm_id, category, rule_key, rule_value, source_url) VALUES ($1, $2, $3, $4, $5)',
          [firmRow.id, rule.category, rule.rule_key, rule.rule_value, firmRow.website]
        );
      } else if (existing.rows[0].rule_value !== rule.rule_value) {
        // Cambio detectado
        await query('UPDATE rules SET is_current = FALSE WHERE id = $1', [existing.rows[0].id]);
        await query(
          'INSERT INTO rules (prop_firm_id, category, rule_key, rule_value, source_url) VALUES ($1, $2, $3, $4, $5)',
          [firmRow.id, rule.category, rule.rule_key, rule.rule_value, firmRow.website]
        );
        await query(
          'INSERT INTO rule_changes (prop_firm_id, rule_key, old_value, new_value) VALUES ($1, $2, $3, $4)',
          [firmRow.id, rule.rule_key, existing.rows[0].rule_value, rule.rule_value]
        );
        changes++;
      }
    }
  }

  console.log(`✅ [Rules] Refresh completo. ${changes} cambios detectados.`);
  return { ok: true, changes };
}

/**
 * Programa el cron diario a las 08:00 hora de Madrid.
 */
export function scheduleRulesRefresh() {
  cron.schedule('0 8 * * *', refreshRules, { timezone: 'Europe/Madrid' });
  console.log('⏰ Cron de refresh de normas programado para las 08:00 Madrid');
}
