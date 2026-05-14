import { useEffect, useState } from 'react';
import './Dashboard.css';

const API = '/api';

const fmt = (n, opts = {}) => {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    ...opts
  });
};

export default function Dashboard() {
  const [data, setData] = useState({ accounts: [], evolution: {} });
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/dashboard`, { credentials: 'include' });
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000); // refrescar cada 30s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="dash-loading">
        <div className="dash-pulse" />
        <p>CARGANDO DATOS...</p>
      </div>
    );
  }

  if (data.accounts.length === 0) {
    return (
      <div className="dash-empty">
        <h2>NO HAY CUENTAS REGISTRADAS</h2>
        <p>Ve al <b>CHAT GESTIÓN</b> y pega una captura del dashboard de tu prop firm.</p>
        <p>Claude leerá los datos y creará la cuenta automáticamente.</p>
      </div>
    );
  }

  // Totales agregados
  const totals = data.accounts.reduce((acc, a) => {
    const last = a.last_snapshot;
    if (last) {
      acc.balance += Number(last.balance || 0);
      acc.pnl_today += Number(last.pnl_today || 0);
      acc.pnl_total += Number(last.pnl_total || 0);
    }
    return acc;
  }, { balance: 0, pnl_today: 0, pnl_total: 0 });

  return (
    <div className="dashboard">
      {/* Totales globales */}
      <div className="dash-totals">
        <div className="total-card">
          <div className="total-label">BALANCE TOTAL</div>
          <div className="total-value mono-num">{fmt(totals.balance)}</div>
        </div>
        <div className="total-card">
          <div className="total-label">PNL HOY</div>
          <div className={`total-value mono-num ${totals.pnl_today >= 0 ? 'value-pos' : 'value-neg'}`}>{fmt(totals.pnl_today)}</div>
        </div>
        <div className="total-card">
          <div className="total-label">PNL ACUMULADO</div>
          <div className={`total-value mono-num ${totals.pnl_total >= 0 ? 'value-pos' : 'value-neg'}`}>{fmt(totals.pnl_total)}</div>
        </div>
        <div className="total-card">
          <div className="total-label">CUENTAS ACTIVAS</div>
          <div className="total-value mono-num">{data.accounts.length}</div>
        </div>
      </div>

      {/* Grid de tarjetas por cuenta */}
      <div className="dash-grid">
        {data.accounts.map((acc) => (
          <AccountCard key={acc.id} account={acc} evolution={data.evolution[acc.id] || []} />
        ))}
      </div>

      {/* Tabla compacta */}
      <div className="panel" style={{ marginTop: 24 }}>
        <h3 className="panel-title">📋 RESUMEN DE CUENTAS</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="dash-table">
            <thead>
              <tr>
                <th>Cuenta</th>
                <th>Firm</th>
                <th style={{ textAlign: 'right' }}>Balance</th>
                <th style={{ textAlign: 'right' }}>PnL hoy</th>
                <th style={{ textAlign: 'right' }}>PnL total</th>
                <th style={{ textAlign: 'right' }}>DD actual</th>
                <th style={{ textAlign: 'right' }}>Días</th>
                <th>Alertas</th>
              </tr>
            </thead>
            <tbody>
              {data.accounts.map((acc) => {
                const last = acc.last_snapshot;
                return (
                  <tr key={acc.id}>
                    <td><b>{acc.account_label}</b></td>
                    <td className="dim">{acc.firm_slug}</td>
                    <td className="mono-num right">{fmt(last?.balance)}</td>
                    <td className={`mono-num right ${last?.pnl_today >= 0 ? 'value-pos' : 'value-neg'}`}>{fmt(last?.pnl_today)}</td>
                    <td className={`mono-num right ${last?.pnl_total >= 0 ? 'value-pos' : 'value-neg'}`}>{fmt(last?.pnl_total)}</td>
                    <td className="mono-num right">{fmt(last?.trailing_dd_now)}</td>
                    <td className="mono-num right">{last?.trading_days ?? '—'}</td>
                    <td>
                      {acc.alerts.length === 0 ? (
                        <span className="badge ok">✓ OK</span>
                      ) : (
                        acc.alerts.map((a, i) => (
                          <span key={i} className={`badge ${a.level}`}>{a.msg}</span>
                        ))
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AccountCard({ account, evolution }) {
  const last = account.last_snapshot;
  const hasAlerts = account.alerts.length > 0;
  const criticalAlert = account.alerts.some((a) => a.level === 'critical');
  return (
    <div className={`acc-card ${criticalAlert ? 'critical' : hasAlerts ? 'warning' : ''}`}>
      <div className="acc-head">
        <div>
          <div className="acc-label">{account.account_label}</div>
          <div className="acc-firm">{account.firm_name} · {fmt(account.size_usd)}</div>
        </div>
        {hasAlerts && (
          <div className="acc-alert-icon">{criticalAlert ? '⚠' : '⚡'}</div>
        )}
      </div>

      <div className="acc-metrics">
        <Metric label="Balance" value={fmt(last?.balance)} />
        <Metric label="PnL hoy" value={fmt(last?.pnl_today)} className={last?.pnl_today >= 0 ? 'value-pos' : 'value-neg'} />
        <Metric label="DD actual" value={fmt(last?.trailing_dd_now)} />
      </div>

      {/* Mini gráfico de evolución */}
      {evolution.length >= 2 && <Sparkline data={evolution} />}

      {account.alerts.length > 0 && (
        <div className="acc-alerts">
          {account.alerts.map((a, i) => (
            <div key={i} className={`acc-alert ${a.level}`}>{a.msg}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, className = '' }) {
  return (
    <div className="acc-metric">
      <div className="acc-metric-label">{label}</div>
      <div className={`acc-metric-value mono-num ${className}`}>{value}</div>
    </div>
  );
}

function Sparkline({ data }) {
  const values = data.map((d) => Number(d.balance || 0));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((v, i) => `${(i / (values.length - 1)) * 100},${100 - ((v - min) / range) * 100}`)
    .join(' ');
  const lastVal = values[values.length - 1];
  const firstVal = values[0];
  const trending = lastVal >= firstVal ? 'pos' : 'neg';
  return (
    <div className="acc-spark">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline
          points={points}
          fill="none"
          stroke={trending === 'pos' ? '#6cd97e' : '#f76b6b'}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
