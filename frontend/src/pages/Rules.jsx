import { useEffect, useState } from 'react';
import { getRules, getRuleChanges, refreshRules } from '../lib/api';
import './Rules.css';

const FIRMS_ORDER = ['topone', 'tradeify', 'mffu'];
const FIRM_NAMES = {
  topone: 'TOP ONE',
  tradeify: 'TRADEIFY',
  mffu: 'MFFU'
};

const CATEGORY_META = {
  drawdown:    { icon: '📉', label: 'Drawdown',     order: 1 },
  daily_loss:  { icon: '⛔', label: 'Daily Loss',    order: 2 },
  consistency: { icon: '📊', label: 'Consistencia', order: 3 },
  payout:      { icon: '💰', label: 'Payout',       order: 4 },
  scaling:     { icon: '📈', label: 'Scaling',      order: 5 },
  fees:        { icon: '🏷️', label: 'Fees',         order: 6 },
  otros:       { icon: '📌', label: 'Otros',        order: 99 }
};

function formatKey(key) {
  if (!key) return '';
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\b(50k|100k|150k|25k|10k|200k|300k)\b/gi, (m) => `${m.toUpperCase()}`)
    .replace(/\b(Dd)\b/g, 'DD')
    .replace(/\b(Pct)\b/g, '%')
    .replace(/\b(Min|Max)\b/g, (m) => m.toLowerCase());
}

function formatValue(value) {
  if (!value) return '—';
  // Si es solo un número, prepende $
  if (/^\d+(\.\d+)?$/.test(value)) return `$${Number(value).toLocaleString()}`;
  return value;
}

function daysAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (diff === 0) return 'hoy';
  if (diff === 1) return 'ayer';
  return `hace ${diff}d`;
}

export default function Rules() {
  const [rules, setRules] = useState([]);
  const [changes, setChanges] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  async function load() {
    const [r, c] = await Promise.all([getRules(), getRuleChanges()]);
    setRules(r);
    setChanges(c);
    setLastUpdate(new Date());
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000); // refrescar cada minuto
    return () => clearInterval(interval);
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refreshRules();
      await load();
    } catch (e) {
      alert('Error: ' + e.message);
    }
    setRefreshing(false);
  }

  // Agrupar normas por firm y categoria
  const byFirm = {};
  for (const slug of FIRMS_ORDER) byFirm[slug] = {};

  for (const r of rules) {
    const slug = r.firm_slug;
    const cat = r.category || 'otros';
    if (!byFirm[slug]) byFirm[slug] = {};
    if (!byFirm[slug][cat]) byFirm[slug][cat] = [];
    byFirm[slug][cat].push(r);
  }

  // Mapa de cambios recientes por rule_key+firm para marcarlos
  const changeMap = {};
  for (const c of changes) {
    const key = `${c.firm_slug}::${c.rule_key}`;
    if (!changeMap[key] || new Date(c.detected_at) > new Date(changeMap[key].detected_at)) {
      changeMap[key] = c;
    }
  }

  // Sort de categorías
  const sortCats = (cats) => Object.keys(cats).sort((a, b) =>
    (CATEGORY_META[a]?.order ?? 99) - (CATEGORY_META[b]?.order ?? 99)
  );

  return (
    <div className="rules-page">
      {/* Banner cambios recientes */}
      {changes.length > 0 && (
        <div className="changes-banner">
          <span className="changes-badge">⚡ {changes.length} cambio{changes.length !== 1 ? 's' : ''} reciente{changes.length !== 1 ? 's' : ''} (30d)</span>
          <div className="changes-scroll">
            {changes.slice(0, 5).map((c) => (
              <span key={c.id} className="change-pill">
                <b>{FIRM_NAMES[c.firm_slug] || c.firm_slug}</b> · {formatKey(c.rule_key)} · {formatValue(c.old_value)} → {formatValue(c.new_value)} <span className="change-date">({daysAgo(c.detected_at)})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="rules-header">
        <div>
          <h2 className="rules-title">NORMAS VIGENTES</h2>
          {lastUpdate && (
            <p className="rules-update">Última actualización: {lastUpdate.toLocaleTimeString()} · Auto-refresh cada 60s</p>
          )}
        </div>
        <button className="btn" onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? '🔍 Buscando…' : '↻ Refrescar ahora'}
        </button>
      </div>

      {rules.length === 0 ? (
        <div className="rules-empty">
          <p>No hay normas cargadas.</p>
          <p className="hint">Pulsa <b>"Refrescar ahora"</b> para que Claude busque las normas de cada prop firm en sus webs oficiales.</p>
          <p className="hint">O dile en cualquier chat: <i>"Carga las normas de TopOne, Tradeify y MFFU"</i></p>
        </div>
      ) : (
        <div className="rules-grid">
          {FIRMS_ORDER.map((slug) => {
            const firmRules = byFirm[slug] || {};
            const hasRules = Object.keys(firmRules).length > 0;
            const firmName = FIRM_NAMES[slug];

            return (
              <div key={slug} className={`firm-column firm-${slug}`}>
                <div className="firm-header">
                  <h3 className="firm-name">{firmName}</h3>
                </div>

                {!hasRules ? (
                  <div className="firm-empty">
                    <p>Sin normas cargadas todavía</p>
                    <p className="hint-small">Pulsa refrescar o pide a Claude que las busque</p>
                  </div>
                ) : (
                  <div className="firm-body">
                    {sortCats(firmRules).map((cat) => {
                      const meta = CATEGORY_META[cat] || CATEGORY_META.otros;
                      return (
                        <div key={cat} className="rule-category">
                          <div className="cat-header">
                            <span className="cat-icon">{meta.icon}</span>
                            <span className="cat-label">{meta.label}</span>
                          </div>
                          <div className="cat-rules">
                            {firmRules[cat].map((r) => {
                              const changeKey = `${slug}::${r.rule_key}`;
                              const change = changeMap[changeKey];
                              return (
                                <div key={r.id} className={`rule-item ${change ? 'changed' : ''}`}>
                                  <div className="rule-label">{formatKey(r.rule_key)}</div>
                                  <div className="rule-value mono-num">{formatValue(r.rule_value)}</div>
                                  {change && (
                                    <div className="rule-change-pill">⚡ cambió {daysAgo(change.detected_at)}</div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
