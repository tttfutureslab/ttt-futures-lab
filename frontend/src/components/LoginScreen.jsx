import { useState } from 'react';
import { login } from '../lib/api';
import './LoginScreen.css';

export default function LoginScreen({ onSuccess }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(password);
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Acceso denegado');
      setPassword('');
    }
    setLoading(false);
  }

  return (
    <div className="login-screen">
      <div className="login-overlay" />
      <div className="login-glow" />

      <form className="login-panel" onSubmit={handleSubmit}>
        <div className="login-logo">
          <svg viewBox="0 0 100 100" width="56" height="56" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2">
            <circle cx="50" cy="50" r="46" strokeWidth="1.5" strokeDasharray="3 4" />
            <circle cx="50" cy="50" r="38" strokeWidth="1" />
            <circle cx="50" cy="50" r="30" strokeDasharray="6 4" strokeWidth="3" stroke="rgba(255,255,255,0.4)" />
            <line x1="50" y1="50" x2="50" y2="22" strokeWidth="3" strokeLinecap="round" stroke="#fff" />
            <line x1="50" y1="50" x2="68" y2="50" strokeWidth="2" strokeLinecap="round" stroke="#fff" />
            <circle cx="50" cy="50" r="3" fill="#fff" stroke="none" />
          </svg>
        </div>

        <h1 className="login-title">TTT FUTURES LAB</h1>
        <p className="login-sub">— ACCESO RESTRINGIDO —</p>

        <label htmlFor="pwd">Contraseña</label>
        <input
          id="pwd"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          autoComplete="current-password"
          required
          disabled={loading}
        />

        {error && <div className="login-error">{error}</div>}

        <button type="submit" className="btn btn-primary login-btn" disabled={loading || !password}>
          {loading ? 'Verificando…' : 'Entrar'}
        </button>

        <p className="login-footer">Engineers of Time Levels Theorem</p>
      </form>
    </div>
  );
}
