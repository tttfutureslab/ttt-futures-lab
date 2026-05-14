import { useEffect, useState } from 'react';
import { getAccounts, analyzeScreenshot, saveSnapshot } from '../lib/api';

export default function UploadShot() {
  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [extracted, setExtracted] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => { getAccounts().then(setAccounts); }, []);

  function handleFile(f) {
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setExtracted(null);
    setSaved(false);
  }

  async function handleAnalyze() {
    if (!file) return;
    setAnalyzing(true);
    try {
      const result = await analyzeScreenshot(file);
      setExtracted(result.extracted);
    } catch (e) {
      alert('Error: ' + e.message);
    }
    setAnalyzing(false);
  }

  async function handleSave() {
    if (!extracted || !accountId) {
      alert('Selecciona una cuenta primero');
      return;
    }
    await saveSnapshot({
      account_id: accountId,
      balance: extracted.balance,
      equity: extracted.equity,
      pnl_today: extracted.pnl_today,
      pnl_total: extracted.pnl_total,
      trailing_dd_now: extracted.trailing_dd_now,
      best_day_pnl: extracted.best_day_pnl,
      trading_days: extracted.trading_days,
      raw_vision_data: extracted
    });
    setSaved(true);
  }

  return (
    <div>
      <h2 className="panel-title">Subir captura del dashboard</h2>

      <div className="panel" style={{ marginBottom: 16 }}>
        <label>Cuenta destino</label>
        <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          <option value="">— Selecciona una cuenta —</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.account_label} ({a.firm_name})</option>)}
        </select>
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <label>Captura del dashboard</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
        />
        {preview && (
          <div style={{ marginTop: 12 }}>
            <img src={preview} alt="preview" style={{ maxWidth: '100%', maxHeight: 400, border: '1px solid var(--silver-line-strong)', borderRadius: 8 }} />
          </div>
        )}
        <button className="btn btn-primary" onClick={handleAnalyze} disabled={!file || analyzing} style={{ marginTop: 12 }}>
          {analyzing ? 'Analizando con Claude…' : '🔬 Analizar captura'}
        </button>
      </div>

      {extracted && (
        <div className="panel">
          <h3 className="panel-title">Datos extraídos · confianza: {extracted.confidence}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            {Object.entries({
              'Prop firm': extracted.prop_firm,
              'Cuenta': extracted.account_label,
              'Tamaño': extracted.account_size,
              'Balance': extracted.balance,
              'Equity': extracted.equity,
              'PnL hoy': extracted.pnl_today,
              'PnL total': extracted.pnl_total,
              'DD actual': extracted.trailing_dd_now,
              'Mejor día': extracted.best_day_pnl,
              'Trading days': extracted.trading_days
            }).map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: 10, color: 'var(--silver-dim)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>{k}</div>
                <div className="mono-num" style={{ fontSize: 16, marginTop: 2 }}>{v ?? '—'}</div>
              </div>
            ))}
          </div>
          {extracted.raw_observations && (
            <p style={{ fontSize: 11, color: 'var(--silver-dim)', marginTop: 14, fontStyle: 'italic' }}>
              📝 {extracted.raw_observations}
            </p>
          )}
          <button className="btn btn-primary" onClick={handleSave} disabled={saved} style={{ marginTop: 14 }}>
            {saved ? '✓ Guardado' : '💾 Guardar snapshot'}
          </button>
        </div>
      )}
    </div>
  );
}
