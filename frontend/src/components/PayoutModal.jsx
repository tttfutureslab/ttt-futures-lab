import { useState } from 'react';

const API = '/api';

export default function PayoutModal({ accountId, accountData, onClose, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Wise');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const balance = Number(accountData?.last_snapshot?.balance || 0);
  const trailingDd = Number(accountData?.rule_trailing_dd || accountData?.trailing_dd_limit || 2000);
  const safetyNet = Number(accountData?.last_snapshot?.safety_net || (Number(accountData?.size_usd || 0) + 100));

  const amt = Number(amount) || 0;
  const newBal = balance - amt;
  const newDdFloor = amt > 0 ? Math.max(safetyNet, newBal - trailingDd) : null;

  async function handleConfirm() {
    if (!amt || amt <= 0) return;
    setLoading(true);
    try {
      const r = await fetch(API + '/admin/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          account_id: accountId,
          amount_usd: amt,
          payment_method: method,
          notes: notes || null
        })
      });
      if (!r.ok) throw new Error('Error registrando payout');
      onSuccess?.();
      onClose();
    } catch (e) {
      alert('Error: ' + e.message);
    }
    setLoading(false);
  }

  return (
    <div style={{
      position:'fixed',top:0,left:0,right:0,bottom:0,
      background:'rgba(0,0,0,0.75)',display:'flex',
      alignItems:'center',justifyContent:'center',zIndex:1000
    }} onClick={onClose}>
      <div style={{
        background:'#0f1117',border:'1px solid rgba(255,255,255,0.15)',
        borderRadius:12,padding:24,width:360,maxWidth:'90vw'
      }} onClick={e => e.stopPropagation()}>

        <h3 style={{margin:'0 0 16px',fontSize:14,letterSpacing:'0.2em',color:'#6cd97e'}}>
          REGISTRAR PAYOUT
        </h3>

        <div style={{marginBottom:12}}>
          <label style={{fontSize:10,letterSpacing:'0.15em',color:'rgba(255,255,255,0.5)',display:'block',marginBottom:4}}>
            IMPORTE COBRADO (USD)
          </label>
          <input
            type="number"
            step="0.01"
            placeholder="ej: 2000"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            autoFocus
            style={{width:'100%',background:'rgba(0,0,0,0.4)',border:'1px solid rgba(255,255,255,0.2)',color:'#fff',padding:'10px 12px',borderRadius:6,fontFamily:'inherit',fontSize:16,boxSizing:'border-box'}}
          />
        </div>

        {amt > 0 && (
          <div style={{background:'rgba(108,217,126,0.05)',border:'1px solid rgba(108,217,126,0.2)',borderRadius:8,padding:12,marginBottom:12,fontSize:12}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <div>
                <div style={{fontSize:9,color:'rgba(255,255,255,0.4)'}}>BALANCE ACTUAL</div>
                <b style={{color:'rgba(255,255,255,0.8)'}}>{balance.toLocaleString('en-US', {style:'currency',currency:'USD',maximumFractionDigits:0})}</b>
              </div>
              <div>
                <div style={{fontSize:9,color:'rgba(255,255,255,0.4)'}}>BALANCE NUEVO</div>
                <b style={{color:'#6cd97e'}}>{newBal.toLocaleString('en-US', {style:'currency',currency:'USD',maximumFractionDigits:0})}</b>
              </div>
              <div>
                <div style={{fontSize:9,color:'rgba(255,255,255,0.4)'}}>TRAILING DD</div>
                <b>{trailingDd.toLocaleString('en-US', {style:'currency',currency:'USD',maximumFractionDigits:0})}</b>
              </div>
              <div>
                <div style={{fontSize:9,color:'rgba(255,255,255,0.4)'}}>DD FLOOR NUEVO</div>
                <b style={{color:'#f76b6b'}}>{newDdFloor ? newDdFloor.toLocaleString('en-US', {style:'currency',currency:'USD',maximumFractionDigits:0}) : '—'}</b>
              </div>
            </div>
          </div>
        )}

        <div style={{marginBottom:12}}>
          <label style={{fontSize:10,letterSpacing:'0.15em',color:'rgba(255,255,255,0.5)',display:'block',marginBottom:4}}>
            MÉTODO DE PAGO
          </label>
          <select value={method} onChange={e => setMethod(e.target.value)}
            style={{width:'100%',background:'rgba(0,0,0,0.4)',border:'1px solid rgba(255,255,255,0.15)',color:'#fff',padding:'8px 12px',borderRadius:6,fontFamily:'inherit'}}>
            <option>Wise</option>
            <option>PayPal</option>
            <option>Deel</option>
            <option>Crypto</option>
            <option>Transferencia</option>
            <option>Otro</option>
          </select>
        </div>

        <div style={{marginBottom:16}}>
          <label style={{fontSize:10,letterSpacing:'0.15em',color:'rgba(255,255,255,0.5)',display:'block',marginBottom:4}}>
            NOTAS (opcional)
          </label>
          <input type="text" placeholder="Payout #1, referencia..." value={notes}
            onChange={e => setNotes(e.target.value)}
            style={{width:'100%',background:'rgba(0,0,0,0.4)',border:'1px solid rgba(255,255,255,0.15)',color:'#fff',padding:'8px 12px',borderRadius:6,fontFamily:'inherit',boxSizing:'border-box'}} />
        </div>

        <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button onClick={onClose}
            style={{background:'transparent',border:'1px solid rgba(255,255,255,0.15)',color:'rgba(255,255,255,0.6)',padding:'8px 16px',borderRadius:6,cursor:'pointer',fontFamily:'inherit'}}>
            Cancelar
          </button>
          <button
            disabled={!amt || amt <= 0 || loading}
            onClick={handleConfirm}
            style={{background:'rgba(108,217,126,0.15)',border:'1px solid rgba(108,217,126,0.4)',color:'#6cd97e',padding:'8px 20px',borderRadius:6,cursor:'pointer',fontFamily:'inherit',fontWeight:700,fontSize:12,letterSpacing:'0.1em',opacity: (!amt || loading) ? 0.5 : 1}}>
            {loading ? 'Guardando...' : 'CONFIRMAR COBRO'}
          </button>
        </div>

      </div>
    </div>
  );
}
