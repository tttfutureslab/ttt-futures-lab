import { useState, useEffect } from 'react';
import Modal from './Modal';

const API = '/api';

// Listas para selects
const FIRMS = [
  { slug: 'topone', name: 'TopOne Futures' },
  { slug: 'tradeify', name: 'Tradeify' },
  { slug: 'mffu', name: 'MyFundedFutures' },
  { slug: 'apex', name: 'Apex Trader Funding' },
  { slug: 'lucid', name: 'Lucid Trading' },
  { slug: 'earn2trade', name: 'Earn2Trade' }
];
const TRADERS = [{ slug: 'adri', name: 'ADRI' }, { slug: 'juanka', name: 'JUANKA' }];
const STATUSES = ['active', 'passed', 'blown', 'paused', 'archived'];
const PHASES = ['challenge', 'funded'];
const TYPES = ['elite_daily', 'elite_access', 'elite_static', 'growth', 'select', 'select_flex', 'flex', 'starter', 'expert', 'eod', 'gauntlet_mini', 'select_daily'];
const SESSIONS = ['Asia', 'London', 'NY AM', 'NY PM'];
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
const RESULTS = ['TP', 'SL', 'BE', 'partial'];

// ════ CREAR CUENTA ════
export function CreateAccountModal({ onClose, onSuccess, defaultTrader }) {
  const [rulesPreview, setRulesPreview] = useState(null);
    const [loadingRules, setLoadingRules] = useState(false);
    useEffect(() => {
      const { prop_firm_slug, account_type_name, size_usd, phase } = form;
      if (!prop_firm_slug || !account_type_name || !size_usd || !phase) { setRulesPreview(null); return; }
      setLoadingRules(true);
      fetch('/api/account-rules?firm=' + prop_firm_slug + '&type=' + account_type_name + '&size=' + size_usd + '&phase=' + phase, { credentials: 'include' })
        .then(r => r.json())
        .then(j => { setRulesPreview(j.rules || null); setLoadingRules(false); })
        .catch(() => { setRulesPreview(null); setLoadingRules(false); });
    }, [form.prop_firm_slug, form.account_type_name, form.size_usd, form.phase]);
  const [form, setForm] = useState({
    prop_firm_slug: 'topone',
    trader_slug: defaultTrader || 'adri',
    account_label: '',
    external_account_number: '',
    account_type_name: 'elite_access',
    phase: 'challenge',
    size_usd: 50000,
    daily_loss: -1000,
    trailing_dd: -2000,
    status: 'active'
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.account_label.trim()) return alert('Pon un nombre de cuenta');
    setSaving(true);
    try {
      const r = await fetch(`${API}/admin/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form)
      });
      if (!r.ok) throw new Error((await r.json()).error || 'Error');
      onSuccess?.();
      onClose();
    } catch (e) { alert('Error: ' + e.message); }
    setSaving(false);
  }

  return (
    <Modal title="➕ NUEVA CUENTA" onClose={onClose} size="medium">
      <div className="form-grid-2">
        <div className="form-row">
          <label>Trader</label>
          <select value={form.trader_slug} onChange={(e) => setForm({ ...form, trader_slug: e.target.value })}>
            {TRADERS.map(t => <option key={t.slug} value={t.slug}>{t.name}</option>)}
          </select>
        </div>
        <div className="form-row">
          <label>Prop firm</label>
          <select value={form.prop_firm_slug} onChange={(e) => setForm({ ...form, prop_firm_slug: e.target.value })}>
            {FIRMS.map(f => <option key={f.slug} value={f.slug}>{f.name}</option>)}
          </select>
        </div>
      </div>
      <div className="form-row">
        <label>Nombre / identificador</label>
        <input value={form.account_label} onChange={(e) => setForm({ ...form, account_label: e.target.value })} placeholder="ej: TOP ONE 3 ADRI" />
      </div>
      <div className="form-row">
        <label>Nº cuenta externo (opcional)</label>
        <input value={form.external_account_number || ''} onChange={(e) => setForm({ ...form, external_account_number: e.target.value })} placeholder="TOF97634" />
      </div>
      <div className="form-grid-3">
        <div className="form-row">
          <label>Tipo</label>
          <select value={form.account_type_name} onChange={(e) => setForm({ ...form, account_type_name: e.target.value })}>
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-row">
          <label>Fase</label>
          <select value={form.phase} onChange={(e) => setForm({ ...form, phase: e.target.value })}>
            {PHASES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="form-row">
          <label>Status</label>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="form-grid-3">
        <div className="form-row">
          <label>Tamaño USD</label>
          <select value={form.size_usd || ''} onChange={(e) => setForm({ ...form, size_usd: Number(e.target.value) })}>
            <option value=''>— Elige tamaño —</option>
            <option value='25000'>$25,000</option>
            <option value='50000'>$50,000</option>
            <option value='100000'>$100,000</option>
            <option value='150000'>$150,000</option>
            <option value='200000'>$200,000</option>
          </select>
        </div>
        <div className="form-row">
          <label>Daily loss</label>
          <input type="number" value={form.daily_loss} onChange={(e) => setForm({ ...form, daily_loss: Number(e.target.value) })} />
        </div>
        <div className="form-row">
          <label>Trailing DD</label>
          <input type="number" value={form.trailing_dd} onChange={(e) => setForm({ ...form, trailing_dd: Number(e.target.value) })} />
        </div>
      </div>
      {rulesPreview && (
        <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"12px 14px",marginBottom:12,fontSize:12}}>
          <div style={{color:"rgba(255,255,255,0.5)",fontSize:10,letterSpacing:"0.2em",marginBottom:8,fontWeight:700}}>REGLAS DETECTADAS</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(130px, 1fr))",gap:8}}>
            {rulesPreview.trailing_dd && <div><span style={{color:"rgba(255,255,255,0.4)",fontSize:9}}>TRAILING DD</span><br/><b style={{color:"#f76b6b"}}>${Number(rulesPreview.trailing_dd).toLocaleString()}</b></div>}
            {rulesPreview.daily_loss && <div><span style={{color:"rgba(255,255,255,0.4)",fontSize:9}}>DLL</span><br/><b style={{color:"#f7c66b"}}>${Number(rulesPreview.daily_loss).toLocaleString()}</b></div>}
            {rulesPreview.profit_target && <div><span style={{color:"rgba(255,255,255,0.4)",fontSize:9}}>PROFIT TARGET</span><br/><b style={{color:"#6cd97e"}}>${Number(rulesPreview.profit_target).toLocaleString()}</b></div>}
            {rulesPreview.consistency_pct && <div><span style={{color:"rgba(255,255,255,0.4)",fontSize:9}}>CONSISTENCY</span><br/><b style={{color:"#f7c66b"}}>{rulesPreview.consistency_pct}%</b></div>}
            {rulesPreview.min_trading_days > 0 && <div><span style={{color:"rgba(255,255,255,0.4)",fontSize:9}}>MIN DIAS</span><br/><b>{rulesPreview.min_trading_days}</b></div>}
            {rulesPreview.payout_split_pct && <div><span style={{color:"rgba(255,255,255,0.4)",fontSize:9}}>SPLIT</span><br/><b style={{color:"#6cd97e"}}>{rulesPreview.payout_split_pct}%</b></div>}
          </div>
          {rulesPreview.notes && <div style={{marginTop:8,color:"rgba(255,255,255,0.3)",fontSize:9,fontStyle:"italic"}}>{rulesPreview.notes}</div>}
        </div>
        )}
        {loadingRules && <div style={{fontSize:10,color:"rgba(255,255,255,0.3)",marginBottom:8}}>Buscando reglas...</div>}
        <div className="form-actions">
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Crear cuenta'}</button>
      </div>
    </Modal>
  );
}

// ════ EDITAR CUENTA ════
export function EditAccountModal({ account, onClose, onSuccess }) {
  const [form, setForm] = useState({
    account_label: account.account_label || '',
    external_account_number: account.external_account_number || '',
    trader_slug: account.trader_slug || 'adri',
    account_type_name: account.account_type_name || 'elite_access',
    phase: account.phase || 'challenge',
    size_usd: account.size_usd || 50000,
    daily_loss: account.daily_loss_limit || account.daily_loss || -1000,
    trailing_dd: account.trailing_dd_limit || account.trailing_dd || -2000,
    profit_target: account.profit_target || 0,
    status: account.status || 'active',
    notes: account.notes || ''
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const r = await fetch(`${API}/admin/accounts/${account.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form)
      });
      if (!r.ok) throw new Error((await r.json()).error || 'Error');
      onSuccess?.();
      onClose();
    } catch (e) { alert('Error: ' + e.message); }
    setSaving(false);
  }

  return (
    <Modal title={`✎ EDITAR ${account.account_label}`} onClose={onClose} size="medium">
      <div className="form-grid-2">
        <div className="form-row">
          <label>Nombre</label>
          <input value={form.account_label} onChange={(e) => setForm({ ...form, account_label: e.target.value })} />
        </div>
        <div className="form-row">
          <label>Trader</label>
          <select value={form.trader_slug} onChange={(e) => setForm({ ...form, trader_slug: e.target.value })}>
            {TRADERS.map(t => <option key={t.slug} value={t.slug}>{t.name}</option>)}
          </select>
        </div>
      </div>
      <div className="form-row">
        <label>Nº cuenta externo</label>
        <input value={form.external_account_number} onChange={(e) => setForm({ ...form, external_account_number: e.target.value })} />
      </div>
      <div className="form-grid-3">
        <div className="form-row">
          <label>Tipo</label>
          <select value={form.account_type_name} onChange={(e) => setForm({ ...form, account_type_name: e.target.value })}>
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-row">
          <label>Fase</label>
          <select value={form.phase} onChange={(e) => setForm({ ...form, phase: e.target.value })}>
            {PHASES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="form-row">
          <label>Status</label>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="form-grid-3">
        <div className="form-row">
          <label>Tamaño</label>
          <input type="number" value={form.size_usd} onChange={(e) => setForm({ ...form, size_usd: Number(e.target.value) })} />
        </div>
        <div className="form-row">
          <label>Daily loss</label>
          <input type="number" value={form.daily_loss} onChange={(e) => setForm({ ...form, daily_loss: Number(e.target.value) })} />
        </div>
        <div className="form-row">
          <label>Trailing DD</label>
          <input type="number" value={form.trailing_dd} onChange={(e) => setForm({ ...form, trailing_dd: Number(e.target.value) })} />
        </div>
      </div>
      <div className="form-row">
        <label>Notas</label>
        <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
      </div>
      <div className="form-actions">
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? '...' : 'Guardar'}</button>
      </div>
    </Modal>
  );
}

// ════ AÑADIR TRADE ════
export function AddTradeModal({ accountId, onClose, onSuccess }) {
  const [form, setForm] = useState({
    asset: 'NQ',
    direction: 'long',
    contracts: 1,
    entry_price: 0,
    exit_price: 0,
    result: 'TP',
    pnl_usd: 0,
    session: 'NY AM',
    quarter: 'Q3',
    ict_setup: '',
    reason: '',
    trade_at: ''
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const r = await fetch(`${API}/admin/trades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...form, account_id: accountId })
      });
      if (!r.ok) throw new Error((await r.json()).error || 'Error');
      onSuccess?.();
      onClose();
    } catch (e) { alert('Error: ' + e.message); }
    setSaving(false);
  }

  return (
    <Modal title="📈 AÑADIR TRADE" onClose={onClose} size="medium">
      <div className="form-grid-3">
        <div className="form-row">
          <label>Activo</label>
          <input value={form.asset} onChange={(e) => setForm({ ...form, asset: e.target.value })} />
        </div>
        <div className="form-row">
          <label>Dirección</label>
          <select value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })}>
            <option value="long">long</option><option value="short">short</option>
          </select>
        </div>
        <div className="form-row">
          <label>Contratos</label>
          <input type="number" value={form.contracts} onChange={(e) => setForm({ ...form, contracts: Number(e.target.value) })} />
        </div>
      </div>
      <div className="form-grid-2">
        <div className="form-row">
          <label>Entry</label>
          <input type="number" step="0.01" value={form.entry_price} onChange={(e) => setForm({ ...form, entry_price: Number(e.target.value) })} />
        </div>
        <div className="form-row">
          <label>Exit</label>
          <input type="number" step="0.01" value={form.exit_price} onChange={(e) => setForm({ ...form, exit_price: Number(e.target.value) })} />
        </div>
      </div>
      <div className="form-grid-3">
        <div className="form-row">
          <label>Resultado</label>
          <select value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })}>
            {RESULTS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="form-row">
          <label>PnL USD</label>
          <input type="number" step="0.01" value={form.pnl_usd} onChange={(e) => setForm({ ...form, pnl_usd: Number(e.target.value) })} />
        </div>
        <div className="form-row">
          <label>Sesión</label>
          <select value={form.session} onChange={(e) => setForm({ ...form, session: e.target.value })}>
            {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="form-grid-2">
        <div className="form-row">
          <label>Cuarto</label>
          <select value={form.quarter} onChange={(e) => setForm({ ...form, quarter: e.target.value })}>
            {QUARTERS.map(q => <option key={q} value={q}>{q}</option>)}
          </select>
        </div>
        <div className="form-row">
          <label>Fecha (opcional)</label>
          <input type="datetime-local" value={form.trade_at} onChange={(e) => setForm({ ...form, trade_at: e.target.value })} />
        </div>
      </div>
      <div className="form-row">
        <label>Setup ICT</label>
        <input value={form.ict_setup} onChange={(e) => setForm({ ...form, ict_setup: e.target.value })} placeholder="XAMD + OTE + CISD..." />
      </div>
      <div className="form-row">
        <label>Razón / notas</label>
        <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={2} />
      </div>
      <div className="form-actions">
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? '...' : 'Guardar trade'}</button>
      </div>
    </Modal>
  );
}

// ════ AÑADIR SNAPSHOT ════
export function AddSnapshotModal({ accountId, onClose, onSuccess }) {
  const [form, setForm] = useState({
    balance: 0, equity: 0, pnl_today: 0, pnl_total: 0,
    trailing_dd_now: 0, best_day_pnl: 0, trading_days: 1, notes: 'Manual'
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const r = await fetch(`${API}/admin/snapshots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...form, account_id: accountId })
      });
      if (!r.ok) throw new Error((await r.json()).error || 'Error');
      onSuccess?.();
      onClose();
    } catch (e) { alert('Error: ' + e.message); }
    setSaving(false);
  }

  return (
    <Modal title="📸 AÑADIR SNAPSHOT" onClose={onClose} size="medium">
      <div className="form-grid-2">
        <div className="form-row">
          <label>Balance</label>
          <input type="number" step="0.01" value={form.balance} onChange={(e) => setForm({ ...form, balance: Number(e.target.value) })} />
        </div>
        <div className="form-row">
          <label>Equity</label>
          <input type="number" step="0.01" value={form.equity} onChange={(e) => setForm({ ...form, equity: Number(e.target.value) })} />
        </div>
      </div>
      <div className="form-grid-2">
        <div className="form-row">
          <label>PnL hoy</label>
          <input type="number" step="0.01" value={form.pnl_today} onChange={(e) => setForm({ ...form, pnl_today: Number(e.target.value) })} />
        </div>
        <div className="form-row">
          <label>PnL total</label>
          <input type="number" step="0.01" value={form.pnl_total} onChange={(e) => setForm({ ...form, pnl_total: Number(e.target.value) })} />
        </div>
      </div>
      <div className="form-grid-3">
        <div className="form-row">
          <label>Trailing DD actual</label>
          <input type="number" step="0.01" value={form.trailing_dd_now} onChange={(e) => setForm({ ...form, trailing_dd_now: Number(e.target.value) })} />
        </div>
        <div className="form-row">
          <label>Best day</label>
          <input type="number" step="0.01" value={form.best_day_pnl} onChange={(e) => setForm({ ...form, best_day_pnl: Number(e.target.value) })} />
        </div>
        <div className="form-row">
          <label>Días</label>
          <input type="number" value={form.trading_days} onChange={(e) => setForm({ ...form, trading_days: Number(e.target.value) })} />
        </div>
      </div>
      <div className="form-row">
        <label>Notas</label>
        <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>
      <div className="form-actions">
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? '...' : 'Guardar snapshot'}</button>
      </div>
    </Modal>
  );
}

// ════ AÑADIR PAYOUT ════
export function AddPayoutModal({ accountId, onClose, onSuccess }) {
  const [form, setForm] = useState({
    amount_usd: 0,
    gross_amount: 0,
    payout_split_pct: 90,
    payout_date: new Date().toISOString().slice(0, 10),
    payment_method: 'wise',
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.amount_usd || form.amount_usd <= 0) return alert('Importe inválido');
    setSaving(true);
    try {
      const r = await fetch(`${API}/admin/payouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...form, account_id: accountId })
      });
      if (!r.ok) throw new Error((await r.json()).error || 'Error');
      onSuccess?.();
      onClose();
    } catch (e) { alert('Error: ' + e.message); }
    setSaving(false);
  }

  return (
    <Modal title="💰 REGISTRAR PAYOUT" onClose={onClose} size="small">
      <div className="form-row">
        <label>Importe neto (lo que cobras)</label>
        <input type="number" step="0.01" value={form.amount_usd} onChange={(e) => setForm({ ...form, amount_usd: Number(e.target.value) })} />
      </div>
      <div className="form-grid-2">
        <div className="form-row">
          <label>Importe bruto (opcional)</label>
          <input type="number" step="0.01" value={form.gross_amount} onChange={(e) => setForm({ ...form, gross_amount: Number(e.target.value) })} />
        </div>
        <div className="form-row">
          <label>Split %</label>
          <input type="number" step="1" value={form.payout_split_pct} onChange={(e) => setForm({ ...form, payout_split_pct: Number(e.target.value) })} />
        </div>
      </div>
      <div className="form-grid-2">
        <div className="form-row">
          <label>Fecha</label>
          <input type="date" value={form.payout_date} onChange={(e) => setForm({ ...form, payout_date: e.target.value })} />
        </div>
        <div className="form-row">
          <label>Método</label>
          <select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
            <option value="wise">Wise</option>
            <option value="bank">Bank</option>
            <option value="crypto">Crypto</option>
            <option value="paypal">PayPal</option>
            <option value="other">Otro</option>
          </select>
        </div>
      </div>
      <div className="form-row">
        <label>Notas</label>
        <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>
      <div className="form-actions">
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? '...' : 'Registrar'}</button>
      </div>
    </Modal>
  );
}


// ════ EDITAR TRADE ════
export function EditTradeModal({ trade, onClose, onSuccess }) {
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
      if (!r.ok) throw new Error((await r.json()).error || 'Error');
      onSuccess?.();
      onClose();
    } catch (e) { alert('Error: ' + e.message); }
    setSaving(false);
  }

  return (
    <Modal title={`✎ EDITAR TRADE #${trade.id}`} onClose={onClose} size="medium">
      <div className="form-row" style={{ background: 'rgba(108,217,126,0.06)', padding: 12, borderRadius: 8, border: '1px solid rgba(108,217,126,0.2)' }}>
        <label style={{ fontSize: 11, color: '#6cd97e' }}>PnL USD (lo más importante)</label>
        <input type="number" step="0.01" value={form.pnl_usd}
          onChange={(e) => setForm({ ...form, pnl_usd: Number(e.target.value) })}
          style={{ fontSize: 22, fontWeight: 700, textAlign: 'center' }} autoFocus />
      </div>
      <div className="form-grid-3">
        <div className="form-row">
          <label>Activo</label>
          <input value={form.asset} onChange={(e) => setForm({ ...form, asset: e.target.value })} />
        </div>
        <div className="form-row">
          <label>Dirección</label>
          <select value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })}>
            <option value="long">long</option><option value="short">short</option>
          </select>
        </div>
        <div className="form-row">
          <label>Contratos</label>
          <input type="number" value={form.contracts} onChange={(e) => setForm({ ...form, contracts: Number(e.target.value) })} />
        </div>
      </div>
      <div className="form-grid-2">
        <div className="form-row">
          <label>Entry</label>
          <input type="number" step="0.01" value={form.entry_price} onChange={(e) => setForm({ ...form, entry_price: Number(e.target.value) })} />
        </div>
        <div className="form-row">
          <label>Exit</label>
          <input type="number" step="0.01" value={form.exit_price} onChange={(e) => setForm({ ...form, exit_price: Number(e.target.value) })} />
        </div>
      </div>
      <div className="form-grid-3">
        <div className="form-row">
          <label>Resultado</label>
          <select value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })}>
            {RESULTS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="form-row">
          <label>Sesión</label>
          <select value={form.session} onChange={(e) => setForm({ ...form, session: e.target.value })}>
            {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-row">
          <label>Cuarto</label>
          <select value={form.quarter} onChange={(e) => setForm({ ...form, quarter: e.target.value })}>
            {QUARTERS.map(q => <option key={q} value={q}>{q}</option>)}
          </select>
        </div>
      </div>
      <div className="form-row">
        <label>Setup ICT</label>
        <input value={form.ict_setup} onChange={(e) => setForm({ ...form, ict_setup: e.target.value })} />
      </div>
      <div className="form-row">
        <label>Razón</label>
        <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={2} />
      </div>
      <div className="form-actions">
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? '...' : 'Guardar'}</button>
      </div>
    </Modal>
  );
}
