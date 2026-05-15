import { Link, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { logout } from '../lib/api';
import './AppHeader.css';

const NAV = [
  { to: '/',            label: '📊 DASHBOARD' },
  { to: '/trading',     label: '📈 TRADING' },
  { to: '/gestion',     label: '💼 GESTIÓN' },
  { to: '/backtesting', label: '🔬 BACKTEST' },
  { to: '/sessions',    label: '🕐 SESIONES' },
  { to: '/rules',       label: '📚 NORMAS' }
];

export default function AppHeader({ onLogout }) {
  const location = useLocation();
  const hourRef = useRef(null);
  const minuteRef = useRef(null);
  const secondRef = useRef(null);

  useEffect(() => {
    let raf;
    function tick() {
      const now = new Date();
      const h = now.getHours() % 12;
      const m = now.getMinutes();
      const s = now.getSeconds();
      const ms = now.getMilliseconds();
      if (hourRef.current) hourRef.current.setAttribute('transform', `rotate(${(h + m / 60) * 30} 50 50)`);
      if (minuteRef.current) minuteRef.current.setAttribute('transform', `rotate(${(m + s / 60) * 6} 50 50)`);
      if (secondRef.current) secondRef.current.setAttribute('transform', `rotate(${(s + ms / 1000) * 6} 50 50)`);
      raf = requestAnimationFrame(tick);
    }
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);

  async function handleLogout() {
    if (!confirm('Cerrar sesion?')) return;
    try { await logout(); } catch (e) {}
    onLogout?.();
  }

  return (
    <header className="app-header">
      <div className="header-left">
        <Link to="/" className="header-logo">
          <svg className="mini-clock" viewBox="0 0 100 100" width="38" height="38" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2">
            <circle cx="50" cy="50" r="46" strokeWidth="1.5" strokeDasharray="3 4" />
            <circle cx="50" cy="50" r="38" strokeWidth="1" />
            <circle cx="50" cy="50" r="30" strokeDasharray="6 4" strokeWidth="3" stroke="rgba(255,255,255,0.4)" />
            <line ref={hourRef} x1="50" y1="50" x2="50" y2="28" strokeWidth="3" strokeLinecap="round" stroke="#fff" />
            <line ref={minuteRef} x1="50" y1="50" x2="50" y2="18" strokeWidth="2" strokeLinecap="round" stroke="#fff" />
            <line ref={secondRef} x1="50" y1="50" x2="50" y2="10" strokeWidth="1" strokeLinecap="round" stroke="#c0c0c0" />
            <circle cx="50" cy="50" r="3" fill="#fff" stroke="none" />
          </svg>
        </Link>
        <div className="header-title">
          <span className="title-main">TTT FUTURES LAB</span>
          <span className="title-sub">Engineers of Time Levels Theorem</span>
        </div>
      </div>
      <nav className="header-nav">
        {NAV.map((item) => (
          <Link key={item.to} to={item.to} className={`nav-link ${location.pathname === item.to ? 'active' : ''}`}>
            {item.label}
          </Link>
        ))}
        <button className="nav-link logout-btn" onClick={handleLogout} title="Cerrar sesion">⎋</button>
      </nav>
    </header>
  );
}
