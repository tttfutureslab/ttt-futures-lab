import { useEffect, useState } from 'react';
import { getAccounts, createAccount, getFirms } from '../lib/api';

const fmt = (n) =>
  n === null || n === undefined ? '—' : n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });

export default function Dashboard() {
  const [accounts, setAccounts] = useState([]);
  const [firms, setFirms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ prop_firm_slug: 'topone', account_label: '', size_usd: 50000, daily_loss: -1250, trailing_dd: -2500 });

  async function load() {
    setLoading(true);
    try {
      const [a, f] = await Promise.all([getAccounts(), getFirms()]);
      setAccounts(a);
      setFirms(f);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    await createAccount(form);
    setShowForm(false);
    load();
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <h2 className="panel-title" style={{ margin: 0 }}>Cuentas activas</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Nueva cuenta'}
        </button>
      </div>

      {showForm && (
        <form className="panel" onSubmit={handleCreate} style={{ marginBottom: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div>
              <label>Prop firm</label>
              <select value={form.prop_firm_slug} onChange={(e) => setForm({ ...form, prop_firm_slug: e.target.value })}>
                {firms.map((f) => <option key={f.slug} value={f.slug}>{f.name}</option>)}
              </select>
            </div>
            <div>
              <label>Nombre cuenta</label>
              <input value={form.account_label} onChange={(e) => setForm({ ...form, account_label: e.target.value })} placeholder="TopOne 50K #1" required />
            </div>
            <div>
              <label>Tamaño USD</label>
              <input type="number" value={form.size_usd} onChange={(e) => setForm({ ...form, size_usd: +e.target.value })} />
            </div>
            <div>
              <label>Daily loss (negativo)</label>
              <input type="number" value={form.daily_loss} onChange={(e) => setForm({ ...form, daily_loss: +e.target.value })} />
            </div>
            <div>
              <label>Trailing DD (negativo)</label>
              <input type="number" value={form.trailing_dd} onChange={(e) => setForm({ ...form, trailing_dd: +e.target.value })} />
            </div>
          </div>
          <button className="btn btn-primary" type="submit" style={{ marginTop: 12 }}>Crear cuenta</button>
        </form>
      )}

      {loading && <p>Cargando...</p>}
      {!loading && accounts.length === 0 && (
        <div className="panel" style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ color: 'var(--silver-dim)' }}>No hay cuentas registradas todavía.</p>
          <p style={{ fontSize: 12, color: 'var(--silver-dim)' }}>Crea tu primera cuenta para empezar a trackear datos con capturas.</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
        {accounts.map((acc) => {
          const last = acc.last_snapshot;
          const pnlClass = last?.pnl_today >= 0 ? 'value-pos' : 'value-neg';
          return (
            <div key={acc.id} className="panel">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0, fontSize: 15, letterSpacing: '0.1em' }}>{acc.account_label}</h3>
                <span style={{ fontSize: 10, color: 'var(--silver-dim)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>{acc.firm_name}</span>
              </div>
              <div style={{ display: 'flex', gap: 18, marginTop: 18, flexWrap: 'wrap' }}>
                <Metric label="Balance" value={fmt(last?.balance)} className="mono-num" />
                <Metric label="PnL hoy" value={fmt(last?.pnl_today)} className={`mono-num ${pnlClass}`} />
                <Metric label="DD actual" value={fmt(last?.trailing_dd_now)} className="mono-num" />
              </div>
              {last?.snapshot_at && (
                <p style={{ fontSize: 10, color: 'var(--silver-dim)', marginTop: 14, marginBottom: 0, letterSpacing: '0.1em' }}>
                  ÚLTIMA ACTUALIZACIÓN: {new Date(last.snapshot_at).toLocaleString()}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ label, value, className }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--silver-dim)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{label}</div>
      <div className={className} style={{ fontSize: 20, fontWeight: 600, marginTop: 4 }}>{value}</div>
    </div>
  );
}
