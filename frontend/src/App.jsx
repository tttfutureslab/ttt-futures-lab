import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SplashScreen from './components/SplashScreen';
import LoginScreen from './components/LoginScreen';
import AppHeader from './components/AppHeader';
import Dashboard from './pages/Dashboard';
import UploadShot from './pages/UploadShot';
import Rules from './pages/Rules';
import Chat from './pages/Chat';
import History from './pages/History';
import { getAuthStatus } from './lib/api';

export default function App() {
  const [phase, setPhase] = useState('checking');

  useEffect(() => {
    getAuthStatus()
      .then((res) => {
        if (res.authenticated) {
          setPhase('splash');
        } else {
          setPhase('login');
        }
      })
      .catch(() => setPhase('login'));
  }, []);

  useEffect(() => {
    const onUnauth = () => setPhase('login');
    window.addEventListener('auth:unauthorized', onUnauth);
    return () => window.removeEventListener('auth:unauthorized', onUnauth);
  }, []);

  useEffect(() => {
    if (phase !== 'splash') return;
    const failsafe = setTimeout(() => {
      console.log('[failsafe] Forzando transicion a app');
      setPhase('app');
    }, 5000);
    return () => clearTimeout(failsafe);
  }, [phase]);

  if (phase === 'checking') {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        background: 'radial-gradient(circle at center, #2e2e2e 0%, #050505 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'rgba(255,255,255,0.4)', fontSize: 11, letterSpacing: '0.3em'
      }}>
        VERIFICANDO ACCESO…
      </div>
    );
  }

  if (phase === 'login') {
    return <LoginScreen onSuccess={() => setPhase('splash')} />;
  }

  if (phase === 'splash') {
    return <SplashScreen mode="auto" onEnter={() => setPhase('app')} />;
  }

  return (
    <BrowserRouter>
      <div className="blueprint-grid" />
      <div className="app-shell">
        <AppHeader onLogout={() => setPhase('login')} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/upload" element={<UploadShot />} />
            <Route path="/rules" element={<Rules />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/history" element={<History />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
