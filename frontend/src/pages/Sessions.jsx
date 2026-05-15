import { useEffect, useState } from 'react';
import './Sessions.css';

const API = '/api';
const SESSIONS = ['Asia', 'London', 'NY AM', 'NY PM'];
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
const WEEKDAYS_ES = { 0: 'Domingo', 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado' };

const fmt = (n) => n === null || n === undefined ? '—' : Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function Sessions() {
  const [stats, setStats] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingInsights, setLoadingInsights] = useState(false);

  async function loadStats() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/sessions-stats`, { credentials: 'include' });
      setStats(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function loadInsights() {
    setLoadingInsights(true);
    try {
      const res = await fetch(`${API}/sessions-stats/insights`, { method: 'POST', credentials: 'include' });
      const json = await res.json();
      setInsights(json.insights);
    } catch (e) {
      setInsights('Error: ' + e.message);
    }
    setLoadingInsights(false);
  }

  useEffect(() => { loadStats(); }, []);

  if (loading) {
    return (
      <div className="sess-loading">
        <div className="dash-pulse" />
        <p>CARGANDO ESTADÍSTICAS...</p>
      </div>
    );
  }

  if (!stats || stats.totals.trades === 0) {
    return (
      <div className="sess-empty">
        <h2>NO HAY TRADES REGISTRADOS</h2>
        <p>Ve al <b>CHAT TRADING</b> y empieza a registrar tus operaciones reales pegando capturas.</p>
        <p>En cuanto haya datos, esta página te mostrará análisis por sesión, cuarto y día.</p>
      </div>
    );
  }

  // Identificar mejor y peor sesión
  const sortedBySession = [...stats.by_session].sort((a, b) => Number(b.pnl) - Number(a.pnl));
  const bestSession = sortedBySession[0];
  const worstSession = sortedBySession[sortedBySession.length - 1];

  // Mejor día de la semana
  const sortedByWeekday = [...stats.by_weekday].sort((a, b) => Number(b.pnl) - Number(a.pnl));
  const bestWeekday = sortedByWeekday[0];

  // Encontrar PnL max y min para colorear el heatmap
  const allPnls = stats.by_session_quarter.map((r) => Number(r.pnl));
  const maxPnl = Math.max(...allPnls, 0);
  const minPnl = Math.min(...allPnls, 0);

  function getHeatColor(pnl) {
    const v = Number(pnl);
    if (v === 0) return 'rgba(255,255,255,0.05)';
    if (v > 0) {
      const intensity = Math.min(v / (maxPnl || 1), 1);
      return `rgba(108, 217, 126, ${0.15 + intensity * 0.5})`;
    } else {
      const intensity = Math.min(Math.abs(v) / Math.abs(minPnl || 1), 1);
      return `rgba(247, 107, 107, ${0.15 + intensity * 0.5})`;
    }
  }

  function getCell(session, quarter) {
    return stats.by_session_quarter.find((r) => r.session === session && r.quarter === quarter);
  }

  // Max abs para barras
  const maxAbsPnl = Math.max(...stats.by_session.map((s) => Math.abs(Number(s.pnl))), 1);

  return (
    <div className="sessions-page">
      {/* Totales */}
      <div className="sess-totals">
        <div className="total-card">
          <div className="total-label">TRADES TOTALES</div>
          <div className="total-value mono-num">{stats.totals.trades}</div>
        </div>
        <div className="total-card">
          <div className="total-label">PNL ACUMULADO</div>
          <div className={`total-value mono-num ${stats.totals.pnl >= 0 ? 'value-pos' : 'value-neg'}`}>{fmt(stats.totals.pnl)}</div>
        </div>
        <div className="total-card">
          <div className="total-label">WIN RATE</div>
          <div className="total-value mono-num">{stats.totals.win_rate || 0}%</div>
        </div>
        <div className="total-card">
          <div className="total-label">TP / SL</div>
          <div className="total-value mono-num"><span className="value-pos">{stats.totals.tp}</span> / <span className="value-neg">{stats.totals.sl}</span></div>
        </div>
      </div>

      {/* Highlights */}
      <div className="sess-highlights">
        <div className="highlight-card best">
          <div className="hl-label">🏆 MEJOR SESIÓN</div>
          <div className="hl-value">{bestSession.session}</div>
          <div className="hl-sub mono-num value-pos">{fmt(bestSession.pnl)} · WR {bestSession.win_rate}%</div>
        </div>
        <div className="highlight-card worst">
          <div className="hl-label">⚠ PEOR SESIÓN</div>
          <div className="hl-value">{worstSession.session}</div>
          <div className="hl-sub mono-num value-neg">{fmt(worstSession.pnl)} · WR {worstSession.win_rate}%</div>
        </div>
        {bestWeekday && (
          <div className="highlight-card">
            <div className="hl-label">📅 MEJOR DÍA</div>
            <div className="hl-value">{WEEKDAYS_ES[bestWeekday.dow_num] || bestWeekday.weekday?.trim()}</div>
            <div className="hl-sub mono-num value-pos">{fmt(bestWeekday.pnl)} · WR {bestWeekday.win_rate}%</div>
          </div>
        )}
      </div>

      {/* Cards por sesión */}
      <div className="sess-section">
        <h3 className="section-title">📊 RENDIMIENTO POR SESIÓN</h3>
        <div className="sess-cards">
          {SESSIONS.map((s) => {
            const data = stats.by_session.find((r) => r.session === s) || { session: s, trades: 0, pnl: 0, win_rate: 0, tp: 0, sl: 0 };
            const pnlNum = Number(data.pnl);
            return (
              <div key={s} className={`sess-card ${pnlNum > 0 ? 'pos' : pnlNum < 0 ? 'neg' : ''}`}>
                <div className="sess-card-name">{s}</div>
                <div className="sess-card-pnl mono-num">{fmt(data.pnl)}</div>
                <div className="sess-card-stats">
                  <span>WR <b>{data.win_rate || 0}%</b></span>
                  <span>{data.trades} trades</span>
                </div>
                <div className="sess-card-detail">
                  <span className="value-pos">TP {data.tp}</span> ·
                  <span className="value-neg"> SL {data.sl}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Barras horizontales */}
      <div className="sess-section">
        <h3 className="section-title">📈 PNL POR SESIÓN (BARRAS)</h3>
        <div className="bar-chart">
          {sortedBySession.map((s) => {
            const pnl = Number(s.pnl);
            const widthPct = (Math.abs(pnl) / maxAbsPnl) * 50;
            const isPositive = pnl >= 0;
            return (
              <div key={s.session} className="bar-row">
                <div className="bar-label">{s.session}</div>
                <div className="bar-track">
                  <div className="bar-zero" />
                  <div
                    className={`bar-fill ${isPositive ? 'pos' : 'neg'}`}
                    style={{
                      width: `${widthPct}%`,
                      left: isPositive ? '50%' : `${50 - widthPct}%`
                    }}
                  />
                  <span className={`bar-value mono-num ${isPositive ? 'value-pos' : 'value-neg'}`}
                    style={{ left: isPositive ? `${50 + widthPct + 1}%` : `${50 - widthPct - 1}%`, transform: isPositive ? 'none' : 'translateX(-100%)' }}>
                    {fmt(pnl)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Heatmap */}
      <div className="sess-section">
        <h3 className="section-title">🔥 HEATMAP SESIÓN × CUARTO</h3>
        <div className="heatmap">
          <div className="heatmap-row heatmap-head">
            <div className="heatmap-cell heatmap-label"></div>
            {QUARTERS.map((q) => <div key={q} className="heatmap-cell heatmap-label">{q}</div>)}
          </div>
          {SESSIONS.map((s) => (
            <div key={s} className="heatmap-row">
              <div className="heatmap-cell heatmap-label">{s}</div>
              {QUARTERS.map((q) => {
                const cell = getCell(s, q);
                if (!cell) return <div key={q} className="heatmap-cell empty">—</div>;
                return (
                  <div key={q} className="heatmap-cell" style={{ background: getHeatColor(cell.pnl) }}>
                    <div className="heatmap-pnl mono-num">{fmt(cell.pnl)}</div>
                    <div className="heatmap-meta">{cell.win_rate}% · {cell.trades}t</div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Días de la semana */}
      <div className="sess-section">
        <h3 className="section-title">📅 POR DÍA DE LA SEMANA</h3>
        <div className="weekday-grid">
          {stats.by_weekday.map((w) => (
            <div key={w.dow_num} className="weekday-card">
              <div className="wd-name">{WEEKDAYS_ES[w.dow_num] || w.weekday?.trim()}</div>
              <div className={`wd-pnl mono-num ${Number(w.pnl) >= 0 ? 'value-pos' : 'value-neg'}`}>{fmt(w.pnl)}</div>
              <div className="wd-stats">WR {w.win_rate || 0}% · {w.trades}t</div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights de Claude */}
      <div className="sess-section">
        <div className="insights-head">
          <h3 className="section-title">🧠 INSIGHTS DE CLAUDE</h3>
          <button className="btn" onClick={loadInsights} disabled={loadingInsights}>
            {loadingInsights ? 'Analizando...' : insights ? '↻ Regenerar' : 'Pedir análisis'}
          </button>
        </div>
        {insights ? (
          <div className="insights-text">{insights}</div>
        ) : (
          <p className="empty-text">Pulsa el botón para que Claude analice tus estadísticas y te sugiera dónde concentrarte.</p>
        )}
      </div>
    </div>
  );
}
