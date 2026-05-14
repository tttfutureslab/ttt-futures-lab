import cron from 'node-cron';
import { claude, CLAUDE_MODEL } from './claude.js';
import { query } from '../db/pool.js';

const SYSTEM_PROMPT = `Eres investigador de normas de prop firms de futuros.
Para cada prop firm, devuelve las normas vigentes en JSON estricto (sin markdown):

{"firms":[{"slug":"topone","rules":[{"category":"drawdown","rule_key":"trailing_dd_50k","rule_value":"2500"}]}]}

Categorias: drawdown, payout, consistency, scaling, fees.`;

export async function refreshRules() {
  console.log('[Rules] Refresh diario...');
  const firms = await query("SELECT id, slug, name, website FROM prop_firms WHERE active = TRUE");

  // Hacer una request por firm para evitar superar 30K tokens en una sola llamada
  let totalChanges = 0;
  for (const firm of firms.rows) {
    try {
      const prompt = `Busca en la web oficial de ${firm.name} (${firm.website}) las normas actuales. Cuentas de 50K USD. Devuelve solo el JSON, sin markdown.

Formato:
{"firms":[{"slug":"${firm.slug}","rules":[{"category":"...","rule_key":"...","rule_value":"..."}]}]}`;

      const response = await claude.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }]
      });

      const text = response.content.filter((c) => c.type === 'text').map((c) => c.text).join('');
      const clean = text.replace(/```json\s*|\s*```/g, '').trim();
      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      if (!jsonMatch) { console.warn(`[Rules] No JSON for ${firm.slug}`); continue; }

      const parsed = JSON.parse(jsonMatch[0]);
      const firmData = parsed.firms?.[0];
      if (!firmData) continue;

      for (const rule of firmData.rules || []) {
        const existing = await query(
          'SELECT id, rule_value FROM rules WHERE prop_firm_id = $1 AND rule_key = $2 AND is_current = TRUE',
          [firm.id, rule.rule_key]
        );
        if (existing.rows.length === 0) {
          await query('INSERT INTO rules (prop_firm_id, category, rule_key, rule_value, source_url) VALUES ($1, $2, $3, $4, $5)',
            [firm.id, rule.category, rule.rule_key, rule.rule_value, firm.website]);
          totalChanges++;
        } else if (existing.rows[0].rule_value !== rule.rule_value) {
          await query('UPDATE rules SET is_current = FALSE WHERE id = $1', [existing.rows[0].id]);
          await query('INSERT INTO rules (prop_firm_id, category, rule_key, rule_value, source_url) VALUES ($1, $2, $3, $4, $5)',
            [firm.id, rule.category, rule.rule_key, rule.rule_value, firm.website]);
          await query('INSERT INTO rule_changes (prop_firm_id, rule_key, old_value, new_value) VALUES ($1, $2, $3, $4)',
            [firm.id, rule.rule_key, existing.rows[0].rule_value, rule.rule_value]);
          totalChanges++;
        }
      }
      console.log(`[Rules] ${firm.slug} procesada`);
    } catch (err) {
      console.error(`[Rules] Error en ${firm.slug}:`, err.message);
    }
  }
  console.log(`[Rules] ${totalChanges} cambios`);
  return { ok: true, changes: totalChanges };
}

export function scheduleRulesRefresh() {
  cron.schedule('0 8 * * *', refreshRules, { timezone: 'Europe/Madrid' });
  console.log('Cron normas: 08:00 Madrid');
}
