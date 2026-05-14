import { useEffect, useState } from 'react';
import { getRules, getRuleChanges, refreshRules } from '../lib/api';

export default function Rules() {
  const [rules, setRules] = useState([]);
  const [changes, setChanges] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    const [r, c] = await Promise.all([getRules(), getRuleChanges()]);
    setRules(r);
    setChanges(c);
  }
  useEffect(() => { load(); }, []);

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

  // Agrupar reglas por firm
  const byFirm = rules.reduce((acc, r) => {
    if (!acc[r.firm_name]) acc[r.firm_name] = [];
    acc[r.firm_name].push(r);
    return acc;
  }, {});

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <h2 className="panel-title" style={{ margin: 0 }}>Normas vigentes</h2>
        <button className="btn" onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? 'Buscando…' : '↻ Refrescar ahora'}
        </button>
      </div>

      {changes.length > 0 && (
        <div className="panel" style={{ marginBottom: 18, borderColor: 'var(--accent-amber)' }}>
          <h3 className="panel-title" style={{ color: 'var(--accent-amber)' }}>⚠ Cambios recientes (30d)</h3>
          {changes.map((c) => (
            <div key={c.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--silver-line)' }}>
              <strong>{c.firm_name}</strong> · <span style={{ color: 'var(--silver-dim)' }}>{c.rule_key}</span>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                <span className="value-neg">{c.old_value}</span> → <span className="value-pos">{c.new_value}</span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--silver-dim)', marginTop: 2 }}>
                {new Date(c.detected_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {Object.entries(byFirm).map(([firmName, firmRules]) => (
        <div key={firmName} className="panel" style={{ marginBottom: 14 }}>
          <h3 style={{ margin: '0 0 12px 0', letterSpacing: '0.15em' }}>{firmName}</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ color: 'var(--silver-dim)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                <th style={{ textAlign: 'left', padding: '6px 8px' }}>Categoría</th>
                <th style={{ textAlign: 'left', padding: '6px 8px' }}>Norma</th>
                <th style={{ textAlign: 'left', padding: '6px 8px' }}>Valor</th>
              </tr>
            </thead>
            <tbody>
              {firmRules.map((r) => (
                <tr key={r.id} style={{ borderTop: '1px solid var(--silver-line)' }}>
                  <td style={{ padding: '8px', color: 'var(--silver-dim)' }}>{r.category}</td>
                  <td style={{ padding: '8px' }}>{r.rule_key}</td>
                  <td className="mono-num" style={{ padding: '8px' }}>{r.rule_value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {rules.length === 0 && (
        <div className="panel" style={{ textAlign: 'center', padding: 40, color: 'var(--silver-dim)' }}>
          Aún no hay normas cargadas. Pulsa "Refrescar ahora" para que Claude las busque.
        </div>
      )}
    </div>
  );
}
