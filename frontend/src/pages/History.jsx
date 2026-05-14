import { useEffect, useState } from 'react';
import { getAccounts, getAccountHistory } from '../lib/api';

export default function History() {
  const [accounts, setAccounts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => { getAccounts().then(setAccounts); }, []);
  useEffect(() => {
    if (selected) getAccountHistory(selected).then(setHistory);
  }, [selected]);

  const fmt = (n) => n === null || n === undefined ? '—' : n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  return (
    <div>
      <h2 className="panel-title">Historial de cuentas</h2>

      <div className="panel" style={{ marginBottom: 16 }}>
        <label>Cuenta</label>
        <select value={selected || ''} onChange={(e) => setSelected(e.target.value)}>
          <option value="">— Selecciona —</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.account_label} ({a.firm_name})</option>)}
        </select>
      </div>

      {selected && history.length > 0 && (
        <div className="panel" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ color: 'var(--silver-dim)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                <th style={{ textAlign: 'left', padding: '6px 8px' }}>Fecha</th>
                <th style={{ textAlign: 'right', padding: '6px 8px' }}>Balance</th>
                <th style={{ textAlign: 'right', padding: '6px 8px' }}>PnL día</th>
                <th style={{ textAlign: 'right', padding: '6px 8px' }}>PnL total</th>
                <th style={{ textAlign: 'right', padding: '6px 8px' }}>DD actual</th>
                <th style={{ textAlign: 'right', padding: '6px 8px' }}>Mejor día</th>
              </tr>
            </thead>
            <tbody>
              {history.map((s) => (
                <tr key={s.id} style={{ borderTop: '1px solid var(--silver-line)' }}>
                  <td style={{ padding: '8px' }}>{new Date(s.snapshot_at).toLocaleString()}</td>
                  <td className="mono-num" style={{ padding: '8px', textAlign: 'right' }}>{fmt(s.balance)}</td>
                  <td className={`mono-num ${s.pnl_today >= 0 ? 'value-pos' : 'value-neg'}`} style={{ padding: '8px', textAlign: 'right' }}>{fmt(s.pnl_today)}</td>
                  <td className={`mono-num ${s.pnl_total >= 0 ? 'value-pos' : 'value-neg'}`} style={{ padding: '8px', textAlign: 'right' }}>{fmt(s.pnl_total)}</td>
                  <td className="mono-num" style={{ padding: '8px', textAlign: 'right' }}>{fmt(s.trailing_dd_now)}</td>
                  <td className="mono-num" style={{ padding: '8px', textAlign: 'right' }}>{fmt(s.best_day_pnl)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && history.length === 0 && (
        <p style={{ color: 'var(--silver-dim)', textAlign: 'center' }}>No hay snapshots todavía para esta cuenta.</p>
      )}
    </div>
  );
}
