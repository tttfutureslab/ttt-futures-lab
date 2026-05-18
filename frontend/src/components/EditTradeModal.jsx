import { useState } from 'react';
import Modal from './Modal';

const API = '/api';
const SESSIONS = ['Asia', 'London', 'NY AM', 'NY PM'];
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
const RESULTS = ['TP', 'SL', 'BE', 'partial'];
const DIRECTIONS = ['long', 'short'];

export default function EditTradeModal({ trade, onClose, onSuccess }) {
  const [form, setForm] = useState({
    asset: trade.asset || 'NQ',
    direction: trade.direction || 'long',
    contracts: trade.contracts || 1,
    entry_price: trade.entry_price || 0,
    exit_price: trade.exit_price || 0,
    result: trade.result || 'TP',
    pnl_usd: trade.pnl_usd || 0,
    session: trade.session || 'NY AM',
    quarter: trade.quarter || 'Q3',
    ict_setup: trade.ict_setup || '',
    reason: trade.reason || ''
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const r = await fetch(`${API}/admin/trades/${trade.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form)
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || 'Error guardando');
      }
      onSuccess?.();
      onClose();
    } catch (e) {
      alert('Error: ' + e.message);
    }
    setSaving(false);
  }

  return (
    <Modal title={`EDITAR TRADE #${trade.id}`} onClose={onClose} size="medium">
      <div className="form-row" style={{
        background: 'rgba(108,217,126,0.06)',
        padding: 14,
        borderRadius: 8,
        border: '1px solid rgba(108,217,126,0.2)'
      }}>
        <label style={{ fontSize: 11, color: '#6cd97e' }}>PnL USD (lo más importante)</label>
        <input
          type="number"
          step="0.01"
          value={form.pnl_usd}
          onChange={(e) => setForm({ ...form, pnl_usd: Number(e.target.value) })}
          style={{ fontSize: 22, fontWeight: 700, textAlign: 'center' }}
          autoFocus
        />
      </div>

      <div className="form-grid-3">
        <div className="form-row">
          <label>Activo</label>
          <input value={form.asset} onChange={(e) => setForm({ ...form, asset: e.target.value })} />
        </div>
        <div className="form-row">
          <label>Dirección</label>
          <select value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })}>
            {DIRECTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="form-row">
          <label>Contratos</label>
          <input
            type="number"
            value={form.contracts}
            onChange={(e) => setForm({ ...form, contracts: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="form-grid-2">
        <div className="form-row">
          <label>Entry</label>
          <input
            type="number"
            step="0.01"
            value={form.entry_price}
            onChange={(e) => setForm({ ...form, entry_price: Number(e.target.value) })}
          />
        </div>
        <div className="form-row">
          <label>Exit</label>
          <input
            type="number"
            step="0.01"
            value={form.exit_price}
            onChange={(e) => setForm({ ...form, exit_price: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="form-grid-3">
        <div className="form-row">
          <label>Resultado</label>
          <select value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })}>
            {RESULTS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="form-row">
          <label>Sesión</label>
          <select value={form.session} onChange={(e) => setForm({ ...form, session: e.target.value })}>
            {SESSIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-row">
          <label>Cuarto</label>
          <select value={form.quarter} onChange={(e) => setForm({ ...form, quarter: e.target.value })}>
            {QUARTERS.map((q) => <option key={q} value={q}>{q}</option>)}
          </select>
        </div>
      </div>

      <div className="form-row">
        <label>Setup ICT</label>
        <input
          value={form.ict_setup}
          onChange={(e) => setForm({ ...form, ict_setup: e.target.value })}
          placeholder="XAMD + OTE + CISD..."
        />
      </div>

      <div className="form-row">
        <label>Razón / notas</label>
        <textarea
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
          rows={3}
        />
      </div>

      <div className="form-actions">
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </Modal>
  );
}
