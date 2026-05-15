import { useEffect, useState } from 'react';
import './AccountProgress.css';

const fmt = (n) => (n === null || n === undefined || isNaN(n)) ? '—'
  : Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });

/**
 * Muestra progreso de una cuenta: challenge → fondeo, funded → payout.
 * Compact mode para dashboard, full mode para drawer.
 */
export default function AccountProgress({ accountId, compact = false }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accountId) return;
    setLoading(true);
    fetch(`/api/account-progress/${accountId}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [accountId]);

  if (loading) return null;
  if (!data || !data.progress) return null;

  const { progress, rules } = data;

  // Sin reglas cargadas → invitacion compacta
  if (!progress.has_rules) {
    if (compact) {
      return (
        <div className="progress-no-rules-compact">
          <span>📋 Sin reglas cargadas</span>
        </div>
      );
    }
    return (
      <div className="progress-no-rules">
        <div className="progress-icon">📋</div>
        <div className="progress-msg">{progress.message}</div>
      </div>
    );
  }

  // CHALLENGE
  if (progress.phase === 'challenge' && progress.challenge) {
    return <ChallengeProgress progress={progress} rules={rules} compact={compact} />;
  }

  // FUNDED
  if (progress.phase === 'funded' && progress.funded) {
    return <FundedProgress progress={progress} rules={rules} compact={compact} />;
  }

  return null;
}

function ChallengeProgress({ progress, rules, compact }) {
  const c = progress.challenge;
  const pct = c.pct_target;
  const ready = c.ready_to_pass;
  const consistencyClass = c.consistency_ok ? 'ok' : 'warn';

  if (compact) {
    return (
      <div className="progress-compact">
        <div className="progress-bar-row">
          <span className="progress-label">🎯 FONDEO</span>
          <span className="progress-value">{fmt(c.current)} / {fmt(c.target)}</span>
        </div>
        <div className="progress-bar">
          <div className={`progress-fill ${ready ? 'ready' : ''}`} style={{ width: pct + '%' }} />
        </div>
        <div className="progress-meta">
          <span>{pct.toFixed(0)}%</span>
          <span className={consistencyClass === 'warn' ? 'value-warn' : ''}>
            Consist {progress.consistency_pct.toFixed(0)}%
          </span>
          <span>{c.days_done}/{c.min_days}d</span>
        </div>
      </div>
    );
  }

  // Modo completo
  return (
    <div className="progress-full">
      <div className="progress-title">🎯 PROGRESO HACIA FONDEO</div>
      <div className="progress-block">
        <div className="progress-row-large">
          <div>
            <div className="progress-key">Target</div>
            <div className="progress-val mono-num">{fmt(c.target)}</div>
          </div>
          <div>
            <div className="progress-key">Actual</div>
            <div className="progress-val mono-num value-pos">{fmt(c.current)}</div>
          </div>
          <div>
            <div className="progress-key">Falta</div>
            <div className="progress-val mono-num">{fmt(c.remaining)}</div>
          </div>
        </div>
        <div className="progress-bar progress-bar-large">
          <div className={`progress-fill ${ready ? 'ready' : ''}`} style={{ width: pct + '%' }} />
          <span className="progress-bar-label">{pct.toFixed(1)}%</span>
        </div>
      </div>

      <div className="progress-checks">
        <Check
          ok={c.days_remaining === 0}
          label={`Días mínimos: ${c.days_done} / ${c.min_days}`}
          extra={c.days_remaining > 0 ? `Faltan ${c.days_remaining}` : '✓ Cumplido'}
        />
        <Check
          ok={c.consistency_ok}
          label={`Consistencia: ${progress.consistency_pct.toFixed(1)}%`}
          extra={`Límite ${c.consistency_limit}% · Best day ${fmt(progress.best_day)}`}
        />
        <Check
          ok={c.current >= c.target}
          label={`Target alcanzado`}
          extra={c.current >= c.target ? `+${fmt(c.current - c.target)} sobre el target` : `Faltan ${fmt(c.remaining)}`}
        />
      </div>

      {ready && (
        <div className="progress-ready-badge">✓ LISTO PARA PASAR LA EVALUACIÓN</div>
      )}
    </div>
  );
}

function FundedProgress({ progress, rules, compact }) {
  const f = progress.funded;
  const ready = f.ready_for_payout;
  const consistencyClass = f.consistency_ok ? 'ok' : 'warn';

  if (compact) {
    return (
      <div className="progress-compact">
        <div className="progress-bar-row">
          <span className="progress-label">💰 PAYOUT</span>
          <span className={`progress-value ${ready ? 'value-pos' : ''}`}>
            {fmt(f.net_payout)}
          </span>
        </div>
        <div className="progress-meta">
          <span className={f.days_remaining > 0 ? 'value-warn' : 'value-pos'}>
            {f.days_done}/{f.min_days}d
          </span>
          <span className={consistencyClass === 'warn' ? 'value-warn' : ''}>
            Consist {progress.consistency_pct.toFixed(0)}%
          </span>
          <span>{ready ? '✓ READY' : 'Pendiente'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="progress-full">
      <div className="progress-title">💰 DISPONIBLE PARA PAYOUT</div>
      <div className="progress-block">
        <div className="progress-row-large">
          <div>
            <div className="progress-key">PnL bruto</div>
            <div className="progress-val mono-num">{fmt(f.gross_pnl)}</div>
          </div>
          <div>
            <div className="progress-key">Split {f.payout_split}%</div>
            <div className="progress-val mono-num value-pos">{fmt(f.net_payout)}</div>
          </div>
          <div>
            <div className="progress-key">Mínimo</div>
            <div className="progress-val mono-num">{fmt(f.min_payout)}</div>
          </div>
        </div>
      </div>

      <div className="progress-checks">
        <Check
          ok={f.days_remaining === 0}
          label={`Días mínimos: ${f.days_done} / ${f.min_days}`}
          extra={f.days_remaining > 0 ? `Faltan ${f.days_remaining}` : '✓ Cumplido'}
        />
        <Check
          ok={f.consistency_ok}
          label={`Consistencia: ${progress.consistency_pct.toFixed(1)}%`}
          extra={`Límite ${f.consistency_limit}% · Best day ${fmt(progress.best_day)}`}
        />
        <Check
          ok={f.gross_pnl >= f.min_payout}
          label={`Payout mínimo`}
          extra={f.gross_pnl >= f.min_payout ? '✓ Cumplido' : `Faltan ${fmt(f.min_payout - f.gross_pnl)}`}
        />
      </div>

      {ready && (
        <div className="progress-ready-badge">✓ PUEDES PEDIR PAYOUT</div>
      )}
      {!ready && !f.consistency_ok && (
        <div className="progress-warning-banner">
          ⚠ Best day {progress.consistency_pct.toFixed(0)}% supera el límite {f.consistency_limit}%.
          Recomendación: opera 2-3 días pequeños para diluir.
        </div>
      )}
    </div>
  );
}

function Check({ ok, label, extra }) {
  return (
    <div className={`progress-check ${ok ? 'check-ok' : 'check-pending'}`}>
      <span className="check-icon">{ok ? '✓' : '○'}</span>
      <div className="check-body">
        <div className="check-label">{label}</div>
        {extra && <div className="check-extra">{extra}</div>}
      </div>
    </div>
  );
}
