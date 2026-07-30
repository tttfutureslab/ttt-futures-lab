import { useEffect, useState, useRef } from 'react';
import AccountProgress from './AccountProgress';
import EditTradeModal from './EditTradeModal';
import { AddSnapshotModal } from './AdminForms';
import './AccountDetailDrawer.css';

const API = '/api';
const fmt = (n) => n === null || n === undefined ? '—' : Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function AccountDetailDrawer({ accountId, onClose, onUpdate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editingTrade, setEditingTrade] = useState(null);
  const [showAdjustBalance, setShowAdjustBalance] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/account-detail/${accountId}`, { credentials: 'include' });
      const json = await res.json();
      setData(json);
      setEditForm({
        account_label: json.account.account_label,
        status: json.account.status,
        daily_loss: json.account.daily_loss,
        trailing_dd: json.account.trailing_dd,
        profit_target: json.account.profit_target,
        notes: json.account.notes || ''
      });
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (accountId) load();
  }, [accountId]);

  async function handleSave() {
    try {
      await fetch(`${API}/account-detail/${accountId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editForm)
      });
      setEditing(false);
      load();
      onUpdate?.();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  }

  async function handleDelete() {
    if (!confirm('Eliminar esta cuenta? Esta accion no se puede deshacer.')) return;
    if (!confirm('Confirmar de nuevo: eliminar definitivamente?')) return;
    try {
      await fetch(`${API}/account-detail/${accountId}`, { method: 'DELETE', credentials: 'include' });
      onClose();
      onUpdate?.();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  }

  if (!accountId) return null;

  async function deleteTrade(tradeId) {
    if (!confirm('¿Borrar este trade definitivamente?')) return;
    try {
      const r = await fetch(`${API}/admin/trades/${tradeId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!r.ok) throw new Error('Error borrando');
      await load();
      onUpdate?.();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  }

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-header">
          <button className="drawer-close" onClick={onClose}>← Volver</button>
          {data && (
            <div className="drawer-actions">
              <button className="btn" onClick={() => setEditing(!editing)}>{editing ? 'Cancelar' : '✎ Editar'}</button>
              <button className="btn btn-danger" onClick={handleDelete}>🗑 Eliminar</button>
            </div>
          )}
        </div>

        {loading && <div className="drawer-loading"><div className="dash-pulse" /></div>}

        {data && !loading && (
          <div className="drawer-body">
            {/* Progreso hacia fondeo/payout */}
            {accountId && <AccountProgress accountId={accountId} compact={false} />}

            {/* Cabecera de la cuenta */}
            <div className="drawer-title-block">
              {editing ? (
                <input
                  type="text"
                  value={editForm.account_label}
                  onChange={(e) => setEditForm({ ...editForm, account_label: e.target.value })}
                  className="edit-input-big"
                />
              ) : (
                <h1 className="drawer-title">{data.account.account_label}</h1>
              )}
              <p className="drawer-sub">
                {data.account.firm_name} · {fmt(data.account.size_usd)} · {' '}
                {editing ? (
                  <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                    <option value="active">ACTIVE</option>
                    <option value="paused">PAUSED</option>
                    <option value="passed">PASSED</option>
                    <option value="blown">BLOWN</option>
                  </select>
                ) : (
                  <span className={`status-badge ${data.account.status}`}>{data.account.status?.toUpperCase()}</span>
                )}
              </p>
            </div>

            {/* Métricas clave */}
            <div className="drawer-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h3 className="section-title">📊 MÉTRICAS</h3>
                <button
                  onClick={() => setShowPayoutModal(true)}
                  title="Cobrar payout"
                  style={{background:'rgba(108,217,126,0.08)',border:'1px solid rgba(108,217,126,0.3)',color:'#6cd97e',padding:'6px 12px',borderRadius:6,fontFamily:'inherit',fontSize:10,letterSpacing:'0.15em',fontWeight:700,cursor:'pointer',marginRight:6}}
                >COBRAR</button>
                <button
                  onClick={() => setShowAdjustBalance(true)}
                  title="Ajustar saldo manualmente"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: 'rgba(255,255,255,0.7)',
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontFamily: 'inherit',
                    fontSize: 10,
                    letterSpacing: '0.15em',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >✎ AJUSTAR SALDO</button>
              </div>
              <div className="metrics-grid">
                <Metric label="Balance" value={fmt(data.last_snapshot?.balance)} />
                <Metric label="PnL hoy" value={fmt(data.last_snapshot?.pnl_today)} className={data.last_snapshot?.pnl_today >= 0 ? 'value-pos' : 'value-neg'} />
                <Metric label="PnL total" value={fmt(data.last_snapshot?.pnl_total)} className={data.last_snapshot?.pnl_total >= 0 ? 'value-pos' : 'value-neg'} />
                <Metric label="DD actual" value={fmt(data.last_snapshot?.trailing_dd_now)} />
                <Metric label="Best day" value={fmt(data.metrics.best_day)} />
                <Metric label="Consistencia" value={`${data.metrics.consistency_pct.toFixed(0)}%`} className={data.metrics.consistency_pct > 30 ? 'value-warn' : 'value-pos'} />
                <Metric label="Trades" value={data.metrics.trades_count} />
                <Metric label="Win rate" value={`${data.metrics.win_rate}%`} />
              </div>
            </div>

            {/* Edición de límites */}
            {editing && (
              <div className="drawer-section edit-section">
                <h3 className="section-title">✎ EDITAR LÍMITES</h3>
                <div className="edit-grid">
                  <div>
                    <label>Daily loss (negativo)</label>
                    <input type="number" value={editForm.daily_loss || ''} onChange={(e) => setEditForm({ ...editForm, daily_loss: e.target.value })} />
                  </div>
                  <div>
                    <label>Trailing DD (negativo)</label>
                    <input type="number" value={editForm.trailing_dd || ''} onChange={(e) => setEditForm({ ...editForm, trailing_dd: e.target.value })} />
                  </div>
                  <div>
                    <label>Profit target</label>
                    <input type="number" value={editForm.profit_target || ''} onChange={(e) => setEditForm({ ...editForm, profit_target: e.target.value })} />
                  </div>
                  <div className="span-2">
                    <label>Notas</label>
                    <textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={2} />
                  </div>
                </div>
                <button className="btn btn-primary" onClick={handleSave} style={{ marginTop: 12 }}>💾 Guardar cambios</button>
              </div>
            )}

            {/* Alertas */}
            {data.alerts.length > 0 && (
              <div className="drawer-section">
                <h3 className="section-title">⚠ ALERTAS</h3>
                {data.alerts.map((a, i) => (
                  <div key={i} className={`alert-row ${a.level}`}>{a.msg}</div>
                ))}
              </div>
            )}

            {/* Gráficos */}
            <div className="drawer-section">
              <h3 className="section-title">📈 EVOLUCIÓN DEL BALANCE</h3>
              {data.snapshots.length >= 2 ? (
                <BalanceChart snapshots={data.snapshots} />
              ) : (
                <p className="empty-text">Necesitas al menos 2 snapshots para ver el gráfico.</p>
              )}
            </div>

            <div className="drawer-section">
              <h3 className="section-title">📊 PNL DIARIO</h3>
              {data.daily_pnl.length > 0 ? (
                <DailyPnlChart data={data.daily_pnl} />
              ) : (
                <p className="empty-text">Sin trades registrados todavía.</p>
              )}
            </div>

            <div className="drawer-section">
              <h3 className="section-title">🎯 CONSISTENCIA</h3>
              <ConsistencyDonut bestDay={data.metrics.best_day} totalPnl={data.metrics.total_pnl} />
            </div>

            {/* Trades de la cuenta */}
            <div className="drawer-section">
              <h3 className="section-title">📋 TRADES ({data.trades.length})</h3>
              {data.trades.length === 0 ? (
                <p className="empty-text">Aún no hay trades en esta cuenta. Pega capturas en el Chat Trading.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="trades-table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Activo</th>
                        <th>Dir</th>
                        <th>Sesión</th>
                        <th>Q</th>
                        <th>Resultado</th>
                        <th style={{ textAlign: 'right' }}>PnL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.trades.map((t) => (
                        <tr key={t.id}>
                          <td>{new Date(t.trade_at).toLocaleString().slice(0, 16)}</td>
                          <td>{t.asset || '—'}</td>
                          <td>{t.direction || '—'}</td>
                          <td>{t.session || '—'}</td>
                          <td>{t.quarter || '—'}</td>
                          <td><span className={`result-badge ${t.result}`}>{t.result}</span></td>
                          <td className={`mono-num right ${t.pnl_usd >= 0 ? 'value-pos' : 'value-neg'}`}>{fmt(t.pnl_usd)}</td>
                          <td style={{ textAlign: "center", width: 70 }}><button onClick={() => setEditingTrade(t)} title="Editar" style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.6)", width: 26, height: 26, borderRadius: 4, cursor: "pointer", fontFamily: "inherit" }}>✎</button><button onClick={() => deleteTrade(t.id)} title="Borrar" style={{ background: "transparent", border: "1px solid rgba(247,107,107,0.25)", color: "rgba(247,107,107,0.7)", width: 26, height: 26, borderRadius: 4, cursor: "pointer", fontFamily: "inherit", marginLeft: 4 }}>🗑</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Snapshots */}
            <div className="drawer-section">
              <h3 className="section-title">🕐 SNAPSHOTS ({data.snapshots.length})</h3>
              <div className="snapshots-list">
                {data.snapshots.slice(-10).reverse().map((s) => (
                  <div key={s.id} className="snapshot-row">
                    <span className="snapshot-date">{new Date(s.snapshot_at).toLocaleString().slice(0, 16)}</span>
                    <span className="mono-num">{fmt(s.balance)}</span>
                    <span className={`mono-num ${s.pnl_today >= 0 ? 'value-pos' : 'value-neg'}`}>{fmt(s.pnl_today)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      {showPayoutModal && (
        <PayoutModal
          accountId={accountId}
          accountData={data && data.account}
          onClose={() => setShowPayoutModal(false)}
          onSuccess={() => { load(); onUpdate && onUpdate(); }}
        />
      )}
      {showAdjustBalance && (
        <AddSnapshotModal
          accountId={accountId}
          onClose={() => setShowAdjustBalance(false)}
          onSuccess={() => { load(); onUpdate?.(); }}
        />
      )}
      {editingTrade && (
        <EditTradeModal
          trade={editingTrade}
          onClose={() => setEditingTrade(null)}
          onSuccess={() => { load(); onUpdate?.(); }}
        />
      )}

    </>
  );
}

function Metric({ label, value, className = '' }) {
  return (
    <div className="metric-cell">
      <div className="metric-label">{label}</div>
      <div className={`metric-value mono-num ${className}`}>{value}</div>
    </div>
  );
}

function BalanceChart({ snapshots }) {
  const values = snapshots.map((s) => Number(s.balance || 0));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((v, i) => `${(i / (values.length - 1)) * 100},${100 - ((v - min) / range) * 100}`).join(' ');
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="chart-svg">
      <polyline points={points} fill="none" stroke="#6cd97e" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function DailyPnlChart({ data }) {
  const values = data.map((d) => Number(d.pnl || 0));
  const absMax = Math.max(...values.map(Math.abs), 1);
  const barW = 100 / data.length;
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="chart-svg">
      <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
      {data.map((d, i) => {
        const v = Number(d.pnl || 0);
        const h = (Math.abs(v) / absMax) * 48;
        const y = v >= 0 ? 50 - h : 50;
        return (
          <rect
            key={i}
            x={i * barW + barW * 0.15}
            y={y}
            width={barW * 0.7}
            height={h}
            fill={v >= 0 ? '#6cd97e' : '#f76b6b'}
          />
        );
      })}
    </svg>
  );
}

function ConsistencyDonut({ bestDay, totalPnl }) {
  if (!totalPnl || totalPnl <= 0) {
    return <p className="empty-text">Sin datos suficientes para consistencia.</p>;
  }
  const pct = Math.min((bestDay / totalPnl) * 100, 100);
  const circumference = 2 * Math.PI * 40;
  const offset = circumference * (1 - pct / 100);
  const color = pct > 30 ? '#f7c66b' : '#6cd97e';
  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 100 100" className="donut-svg">
        <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
        <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={circumference} strokeDashoffset={offset}
          transform="rotate(-90 50 50)" strokeLinecap="round" />
        <text x="50" y="50" textAnchor="middle" dy="-2" fill="#fff" fontSize="16" fontWeight="700">{pct.toFixed(0)}%</text>
        <text x="50" y="50" textAnchor="middle" dy="12" fill="rgba(255,255,255,0.5)" fontSize="6" letterSpacing="1">BEST DAY</text>
      </svg>
      <div className="donut-info">
        <div><b>Best day:</b> {fmt(bestDay)}</div>
        <div><b>Total PnL:</b> {fmt(totalPnl)}</div>
        <div className={pct > 30 ? 'value-warn' : 'value-pos'}>
          {pct > 30 ? '⚠ Sobre el 30% (riesgo en TopOne)' : '✓ Dentro de rangos seguros'}
        </div>
      </div>
    </div>
  );
}
