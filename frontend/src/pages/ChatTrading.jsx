import { useEffect, useState } from 'react';
import './ChatTrading.css';
import { getCurrentTrader } from '../lib/traderContext';

const API = '/api';

const fmt = (n) => (n === null || n === undefined || isNaN(n)) ? '—'
  : Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });

const DIRECTIONS = ['long', 'short'];
const RESULTS = ['TP', 'SL', 'BE', 'partial'];

export default function ChatTrading() {
  const [accounts, setAccounts] = useState([]);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingTrade, setEditingTrade] = useState(null);

  const [form, setForm] = useState({
    account_id: '',
    direction: 'long',
    result: 'TP',
    pnl_usd: '',
    reason: ''
  });

  const currentTrader = getCurrentTrader();

  async function loadAccounts() {
    try {
      const r = await fetch(`${API}/dashboard`, { credentials: 'include' });
      const j = await r.json();
      // Filtrar por trader actual y solo activas
      const filtered = (j.accounts || []).filter((a) => {
        if (currentTrader && a.trader_slug !== currentTrader) return false;
        return ['active', 'paused'].includes(a.status);
      });
      setAccounts(filtered);
      // Si no hay cuenta seleccionada y hay alguna, autoseleccionar la primera
      if (!form.account_id && filtered.length > 0) {
        setForm((f) => ({ ...f, account_id: filtered[0].id }));
      }
    } catch (e) { console.error(e); }
  }

  async function loadTrades() {
    try {
      const r = await fetch(`${API}/admin/trades/recent?limit=50${currentTrader ? '&trader=' + currentTrader : ''}`, { credentials: 'include' });
      if (!r.ok) throw new Error('Error cargando trades');
      const j = await r.json();
      setTrades(j.trades || []);
    } catch (e) {
      console.error(e);
      setTrades([]);
    }
  }

  async function loadAll() {
    setLoading(true);
    await loadAccounts();
    await loadTrades();
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

  async function handleSubmit(e) {
    e?.preventDefault?.();
    if (!form.account_id) { alert('Selecciona una cuenta'); return; }
    if (form.pnl_usd === '' || isNaN(Number(form.pnl_usd))) { alert('PnL inválido'); return; }

    setSaving(true);
    try {
      const payload = {
        account_id: Number(form.account_id),
        asset: 'NQ',
        direction: form.direction,
        contracts: 1,
        result: form.result,
        pnl_usd: Number(form.pnl_usd),
        reason: form.reason || null,
        trade_at: new Date().toISOString()
      };

      const r = await fetch(`${API}/admin/trades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || 'Error');
      }
      // Reset solo PnL y observaciones (mantener cuenta y dirección)
      setForm((f) => ({ ...f, pnl_usd: '', reason: '' }));
      await loadTrades();
    } catch (e) {
      alert('Error: ' + e.message);
    }
    setSaving(false);
  }

  async function handleDelete(tradeId) {
    if (!confirm('¿Borrar este trade?')) return;
    try {
      const r = await fetch(`${API}/admin/trades/${tradeId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!r.ok) throw new Error('Error');
      await loadTrades();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  }

  async function handleUpdate(tradeId, fields) {
    try {
      const r = await fetch(`${API}/admin/trades/${tradeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(fields)
      });
      if (!r.ok) throw new Error('Error');
      setEditingTrade(null);
      await loadTrades();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  }

  if (loading) return <div className="tr-loading">Cargando...</div>;

  if (accounts.length === 0) {
    return (
      <div className="tr-empty">
        <h2>No tienes cuentas activas</h2>
        <p>Ve al Dashboard y crea una cuenta primero.</p>
      </div>
    );
  }

  return (
    <div className="tr-container">
      <header className="tr-header">
        <h1>📈 TRADING</h1>
        <p className="tr-sub">Registro manual de trades · {currentTrader?.toUpperCase()}</p>
      </header>

      {/* FORMULARIO */}
      <form className="tr-form" onSubmit={handleSubmit}>
        <h2 className="tr-form-title">+ NUEVO TRADE</h2>
        <div className="tr-form-grid">
          <div className="tr-field">
            <label>CUENTA</label>
            <select value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.account_label} {a.phase ? `(${a.phase})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="tr-field">
            <label>DIRECCIÓN</label>
            <select value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })}>
              {DIRECTIONS.map((d) => <option key={d} value={d}>{d.toUpperCase()}</option>)}
            </select>
          </div>

          <div className="tr-field">
            <label>RESULTADO</label>
            <select value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })}>
              {RESULTS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="tr-field tr-pnl">
            <label>PNL USD</label>
            <input
              type="number"
              step="0.01"
              placeholder="ej: 750 o -250"
              value={form.pnl_usd}
              onChange={(e) => setForm({ ...form, pnl_usd: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="tr-field tr-field-wide">
          <label>OBSERVACIONES</label>
          <textarea
            placeholder="Setup, contexto, sensaciones, lo que quieras..."
            rows={2}
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
          />
        </div>

        <div className="tr-form-actions">
          <button type="submit" className="tr-btn-save" disabled={saving}>
            {saving ? 'GUARDANDO...' : '✓ GUARDAR TRADE'}
          </button>
        </div>
      </form>

      {/* TABLA DE TRADES */}
      <div className="tr-trades-section">
        <h2 className="tr-section-title">📋 TRADES RECIENTES ({trades.length})</h2>
        {trades.length === 0 ? (
          <p className="tr-empty-text">No hay trades registrados aún.</p>
        ) : (
          <div className="tr-table-wrap">
            <table className="tr-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cuenta</th>
                  <th>Dir</th>
                  <th>Result</th>
                  <th className="right">PnL</th>
                  <th>Obs</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {trades.map((t) => (
                  <TradeRow
                    key={t.id}
                    trade={t}
                    isEditing={editingTrade === t.id}
                    onEdit={() => setEditingTrade(t.id)}
                    onCancel={() => setEditingTrade(null)}
                    onSave={(fields) => handleUpdate(t.id, fields)}
                    onDelete={() => handleDelete(t.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function TradeRow({ trade, isEditing, onEdit, onCancel, onSave, onDelete }) {
  const [editForm, setEditForm] = useState({
    direction: trade.direction || 'long',
    result: trade.result || 'TP',
    pnl_usd: trade.pnl_usd || 0,
    reason: trade.reason || ''
  });

  useEffect(() => {
    setEditForm({
      direction: trade.direction || 'long',
      result: trade.result || 'TP',
      pnl_usd: trade.pnl_usd || 0,
      reason: trade.reason || ''
    });
  }, [trade.id]);

  if (isEditing) {
    return (
      <tr className="tr-editing">
        <td>{new Date(trade.trade_at).toLocaleString().slice(0, 16)}</td>
        <td>{trade.account_label}</td>
        <td>
          <select value={editForm.direction} onChange={(e) => setEditForm({ ...editForm, direction: e.target.value })}>
            {DIRECTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </td>
        <td>
          <select value={editForm.result} onChange={(e) => setEditForm({ ...editForm, result: e.target.value })}>
            {RESULTS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </td>
        <td className="right">
          <input
            type="number"
            step="0.01"
            value={editForm.pnl_usd}
            onChange={(e) => setEditForm({ ...editForm, pnl_usd: Number(e.target.value) })}
            style={{ width: 90 }}
          />
        </td>
        <td>
          <input
            type="text"
            value={editForm.reason}
            onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
            style={{ width: '100%' }}
          />
        </td>
        <td className="tr-actions-cell">
          <button onClick={() => onSave(editForm)} title="Guardar" className="tr-btn-mini tr-btn-save-mini">✓</button>
          <button onClick={onCancel} title="Cancelar" className="tr-btn-mini">✕</button>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td>{new Date(trade.trade_at).toLocaleString().slice(0, 16)}</td>
      <td>{trade.account_label}</td>
      <td><span className={`tr-dir tr-dir-${trade.direction}`}>{trade.direction}</span></td>
      <td><span className={`tr-result tr-result-${trade.result}`}>{trade.result}</span></td>
      <td className={`right tr-pnl-cell ${Number(trade.pnl_usd) >= 0 ? 'pos' : 'neg'}`}>{fmt(trade.pnl_usd)}</td>
      <td className="tr-reason">{trade.reason || '—'}</td>
      <td className="tr-actions-cell">
        <button onClick={onEdit} title="Editar" className="tr-btn-mini tr-btn-edit">✎</button>
        <button onClick={onDelete} title="Borrar" className="tr-btn-mini tr-btn-delete">🗑</button>
      </td>
    </tr>
  );
}
