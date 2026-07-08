import { useEffect, useState } from 'react';

const fmt = (n) => n ? '$' + Number(n).toLocaleString() : null;

export default function RulesPreview({ firm, type, size, phase }) {
  const [rules, setRules] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!firm || !type || !size || !phase) { setRules(null); return; }
    setLoading(true);
    fetch('/api/account-rules?firm=' + firm + '&type=' + type + '&size=' + size + '&phase=' + phase, { credentials: 'include' })
      .then(r => r.json())
      .then(j => { setRules(j.rules || null); setLoading(false); })
      .catch(() => { setRules(null); setLoading(false); });
  }, [firm, type, size, phase]);

  if (loading) return <div style={{fontSize:10,color:'rgba(255,255,255,0.3)',margin:'8px 0'}}>Buscando reglas...</div>;
  if (!rules) return null;

  const items = [
    { label: 'TRAILING DD', value: fmt(rules.trailing_dd), color: '#f76b6b' },
    { label: 'DLL', value: fmt(rules.daily_loss), color: '#f7c66b' },
    { label: 'PROFIT TARGET', value: fmt(rules.profit_target), color: '#6cd97e' },
    { label: 'CONSISTENCY', value: rules.consistency_pct ? rules.consistency_pct + '%' : null, color: '#f7c66b' },
    { label: 'MIN DIAS', value: rules.min_trading_days > 0 ? String(rules.min_trading_days) : null, color: '#fff' },
    { label: 'SPLIT', value: rules.payout_split_pct ? rules.payout_split_pct + '%' : null, color: '#6cd97e' },
    { label: 'SAFETY NET', value: fmt(rules.safety_net), color: '#fff' },
    { label: 'MAX PAYOUTS', value: rules.max_payouts ? String(rules.max_payouts) : null, color: '#fff' },
  ].filter(i => i.value);

  return (
    <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'12px 14px',marginBottom:12}}>
      <div style={{color:'rgba(255,255,255,0.5)',fontSize:10,letterSpacing:'0.2em',marginBottom:8,fontWeight:700}}>REGLAS DETECTADAS</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(120px, 1fr))',gap:8}}>
        {items.map(i => (
          <div key={i.label}>
            <div style={{color:'rgba(255,255,255,0.4)',fontSize:9}}>{i.label}</div>
            <b style={{color:i.color,fontSize:13}}>{i.value}</b>
          </div>
        ))}
      </div>
      {rules.notes && <div style={{marginTop:8,color:'rgba(255,255,255,0.3)',fontSize:9,fontStyle:'italic'}}>{rules.notes}</div>}
    </div>
  );
}
