import { useEffect, useState } from 'react';
import './Dashboard.css';
import AccountDetailDrawer from '../components/AccountDetailDrawer';
import AccountProgress from '../components/AccountProgress';
import { CreateAccountModal } from '../components/AdminForms';
import { getCurrentTrader as _gct } from '../lib/traderContext';
import { getCurrentTrader } from '../lib/traderContext';

const API = '/api';

const fmt = (n) => (n === null || n === undefined || isNaN(n)) ? '—'
  : Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });

const TRADER_COLORS = { adri: '#6cd97e', juanka: '#a3c8ff' };

export default function Dashboard() {
  const [data, setData] = useState({ accounts: [], evolution: {} });
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [viewMode, setViewMode] = useState('all');
  const [showArchived, setShowArchived] = useState(false);
  const [showCreateAccount, setShowCreateAccount] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [dashRes, statsRes] = await Promise.all([
        fetch(`${API}/dashboard`, { credentials: 'include' }),
        fetch(`${API}/dashboard-stats/stats`, { credentials: 'include' })
      ]);
      setData(await dashRes.json());
      const statsData = await statsRes.json();
      setStats(statsData.stats || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  useEffect(() => {
    const current = getCurrentTrader();
    if (current) setViewMode(current);
    load();
    const interval = setInterval(load, 30000);
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

  // Filtros y agrupacion
  const filtered = data.accounts.filter((a) => viewMode === 'all' ? true : a.trader_slug === viewMode);
  const isArchived = (a) => ['archived', 'blown', 'passed'].includes(a.status);
  const activeAccounts = filtered.filter((a) => !isArchived(a));
  const archivedAccounts = filtered.filter(isArchived);
  const adriActive = activeAccounts.filter((a) => a.trader_slug === 'adri');
  const juankaActive = activeAccounts.filter((a) => a.trader_slug === 'juanka');
  const adriArchived = archivedAccounts.filter((a) => a.trader_slug === 'adri');
  const juankaArchived = archivedAccounts.filter((a) => a.trader_slug === 'juanka');

  // Stats por trader (filtrar segun viewMode)
  const visibleStats = viewMode === 'all'
    ? stats
    : stats.filter((s) => s.trader === viewMode);

  if (data.accounts.length === 0) {
    return (
      <div className="dash-empty">
        <h2>NO HAY CUENTAS REGISTRADAS</h2>
        <p>Ve al <b>CHAT GESTIÓN</b> y pídele a Claude que cree tu primera cuenta.</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Tabs trader filter */}
      <div className="trader-tabs">
        <button className={`trader-tab ${viewMode === 'all' ? 'active' : ''}`} onClick={() => setViewMode('all')}>TODO</button>
        <button className={`trader-tab adri ${viewMode === 'adri' ? 'active' : ''}`} onClick={() => setViewMode('adri')}>ADRI</button>
        <button className={`trader-tab juanka ${viewMode === 'juanka' ? 'active' : ''}`} onClick={() => setViewMode('juanka')}>JUANKA</button>
      </div>

      {/* Cards PnL por periodo y trader */}
      <div className="pnl-grid">
        {visibleStats.map((s) => (
          <PnlBlock key={s.trader} stats={s} />
        ))}
      </div>

      {/* 2 columnas trader o grid simple */}
      {viewMode === 'all' ? (
        <div className="dash-two-cols">
          <TraderColumn name="ADRI" color="#6cd97e" accounts={adriActive} evolution={data.evolution} onClick={setSelectedAccount} />
          <TraderColumn name="JUANKA" color="#a3c8ff" accounts={juankaActive} evolution={data.evolution} onClick={setSelectedAccount} />
        </div>
      ) : (
        <div className="dash-grid">
          {activeAccounts.map((acc) => (
            <AccountCard key={acc.id} account={acc} evolution={data.evolution[acc.id] || []} onClick={() => setSelectedAccount(acc.id)} />
          ))}
        </div>
      )}

      {/* Archivadas */}
      {archivedAccounts.length > 0 && (
        <div className="archived-section">
          <button className="archived-toggle" onClick={() => setShowArchived(!showArchived)}>
            <span>{showArchived ? '▼' : '▶'}</span>
            <span>ARCHIVADAS ({archivedAccounts.length})</span>
            <span className="archived-hint">click para {showArchived ? 'ocultar' : 'mostrar'}</span>
          </button>
          {showArchived && (
            <div className="archived-content">
              {viewMode === 'all' ? (
                <div className="dash-two-cols">
                  <TraderColumn name="ADRI" color="#6cd97e" accounts={adriArchived} evolution={data.evolution} onClick={setSelectedAccount} compact />
                  <TraderColumn name="JUANKA" color="#a3c8ff" accounts={juankaArchived} evolution={data.evolution} onClick={setSelectedAccount} compact />
                </div>
              ) : (
                <div className="dash-grid">
                  {archivedAccounts.map((acc) => (
                    <AccountCard key={acc.id} account={acc} evolution={data.evolution[acc.id] || []} onClick={() => setSelectedAccount(acc.id)} compact />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <AccountDetailDrawer
        accountId={selectedAccount}
        onClose={() => setSelectedAccount(null)}
        onUpdate={load}
      />

      <button className="btn-new-account-fab" onClick={() => setShowCreateAccount(true)} title="Nueva cuenta">
        +
      </button>

      {showCreateAccount && (
        <CreateAccountModal
          defaultTrader={viewMode !== 'all' ? viewMode : 'adri'}
          onClose={() => setShowCreateAccount(false)}
          onSuccess={() => { load(); }}
        />
      )}
    </div>
  );
}

function PnlBlock({ stats }) {
  const color = stats.color || TRADER_COLORS[stats.trader] || '#888';
  const payouts = stats.payouts || { payouts_total: 0, payouts_month: 0, payouts_year: 0, payouts_count: 0 };

  const periods = [
    { label: 'HOY',  value: stats.pnl_day,   trades: stats.trades_day },
    { label: 'SEM',  value: stats.pnl_week,  trades: stats.trades_week },
    { label: 'MES',  value: stats.pnl_month, trades: stats.trades_month },
    { label: 'AÑO',  value: stats.pnl_year,  trades: stats.trades_year }
  ];

  return (
    <div className="pnl-block" style={{ borderColor: color + '40' }}>
      <div className="pnl-block-header" style={{ borderColor: color + '30' }}>
        <span className="pnl-trader-dot" style={{ background: color }} />
        <span className="pnl-trader-name" style={{ color }}>{stats.trader_name}</span>
        {Number(stats.pnl_total_all_time) !== 0 && (
          <span className="pnl-historic" title="PnL histórico total (todas las cuentas)">
            HIST {fmt(stats.pnl_total_all_time)}
          </span>
        )}
      </div>
      <div className="pnl-block-cards">
        {periods.map((p) => {
          const v = Number(p.value);
          return (
            <div key={p.label} className="pnl-mini-card">
              <div className="pnl-mini-label">{p.label}</div>
              <div className={`pnl-mini-value mono-num ${v > 0 ? 'value-pos' : v < 0 ? 'value-neg' : ''}`}>{fmt(p.value)}</div>
              <div className="pnl-mini-trades">{p.trades || 0}t</div>
            </div>
          );
        })}
      </div>
      {Number(payouts.payouts_total) > 0 && (
        <div className="pnl-payouts-row" style={{ borderTopColor: color + '30' }}>
          <span className="pnl-payouts-label">💰 PAYOUTS COBRADOS</span>
          <span className="pnl-payouts-detail">
            Mes <b className="value-pos">{fmt(payouts.payouts_month)}</b> ·
            Año <b className="value-pos">{fmt(payouts.payouts_year)}</b> ·
            Total <b className="value-pos">{fmt(payouts.payouts_total)}</b>
            <span className="pnl-payouts-count">({payouts.payouts_count})</span>
          </span>
        </div>
      )}
    </div>
  );
}

function TraderColumn({ name, color, accounts, evolution, onClick, compact }) {
  return (
    <div className="trader-column">
      <div className="trader-column-head" style={{ borderColor: color + '40' }}>
        <span className="trader-column-dot" style={{ background: color }} />
        <span className="trader-column-name" style={{ color }}>{name}</span>
        <span className="trader-column-count">({accounts.length})</span>
      </div>
      {accounts.length === 0 ? (
        <div className="trader-column-empty">Sin cuentas</div>
      ) : (
        <div className="trader-column-cards">
          {accounts.map((acc) => (
            <AccountCard key={acc.id} account={acc} evolution={evolution[acc.id] || []} onClick={() => onClick(acc.id)} compact={compact} />
          ))}
        </div>
      )}
    </div>
  );
}

function AccountCard({ account, evolution, onClick, compact }) {
  const last = account.last_snapshot;
  const hasAlerts = account.alerts && account.alerts.length > 0;
  const criticalAlert = hasAlerts && account.alerts.some((a) => a.level === 'critical');
  const statusLabel = account.status?.toUpperCase();
  const isArchivedStatus = ['archived', 'blown', 'passed'].includes(account.status);

  return (
    <div className={`acc-card ${criticalAlert ? 'critical' : hasAlerts ? 'warning' : ''} ${compact ? 'compact' : ''} ${isArchivedStatus ? 'status-' + account.status : ''}`} onClick={onClick} style={{ cursor: 'pointer' }}>
      <div className="acc-head">
        <div>
          <div className="acc-label">{account.account_label}</div>
          <div className="acc-firm">
            {account.firm_name} · {fmt(account.size_usd)}
            {account.account_type_name && <span className="acc-type"> · {account.account_type_name}</span>}
            {account.phase && <span className="acc-phase"> · {account.phase}</span>}
          </div>
        </div>
        <div className="acc-head-right">
          {isArchivedStatus && <span className={`status-pill status-${account.status}`}>{statusLabel}</span>}
          {hasAlerts && <div className="acc-alert-icon">{criticalAlert ? '⚠' : '⚡'}</div>}
        </div>
      </div>

      {!compact && (
        <div className="acc-metrics">
          <Metric label="Balance" value={fmt(last?.balance)} />
          <Metric label="PnL hoy" value={fmt(last?.pnl_today)} className={last?.pnl_today >= 0 ? 'value-pos' : 'value-neg'} />
          <Metric label="DD actual" value={fmt(last?.trailing_dd_now)} />
        </div>
      )}

      {compact && (
        <div className="acc-metrics-compact">
          <span className="mono-num">{fmt(last?.balance)}</span>
          <span className={`mono-num ${last?.pnl_total >= 0 ? 'value-pos' : 'value-neg'}`}>{fmt(last?.pnl_total)}</span>
        </div>
      )}

      {!compact && evolution.length >= 2 && <Sparkline data={evolution} />}

      {!compact && <AccountProgress accountId={account.id} compact={true} />}

      {!compact && hasAlerts && (
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
  const points = values.map((v, i) => `${(i / (values.length - 1)) * 100},${100 - ((v - min) / range) * 100}`).join(' ');
  const trending = values[values.length - 1] >= values[0] ? 'pos' : 'neg';
  return (
    <div className="acc-spark">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline points={points} fill="none" stroke={trending === 'pos' ? '#6cd97e' : '#f76b6b'} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}
