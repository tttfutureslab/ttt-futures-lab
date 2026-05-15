import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SplashScreen from './components/SplashScreen';
import LoginScreen from './components/LoginScreen';
import TraderPicker from './components/TraderPicker';
import AppHeader from './components/AppHeader';
import PageBurjWrapper from './components/PageBurjWrapper';
import IntroAudio from './components/IntroAudio';
import BurjLoader from './components/BurjLoader';
import Dashboard from './pages/Dashboard';
import ChatTrading from './pages/ChatTrading';
import ChatGestion from './pages/ChatGestion';
import ChatBacktesting from './pages/ChatBacktesting';
import Sessions from './pages/Sessions';
import Rules from './pages/Rules';
import { getAuthStatus } from './lib/api';
import { getCurrentTrader, clearCurrentTrader } from './lib/traderContext';

function AppContent({ onLogout, onSwitchTrader }) {
  return (
    <>
      <AppHeader onLogout={onLogout} onSwitchTrader={onSwitchTrader} />
      <main className="main-content">
        <PageBurjWrapper>
          <Routes>
            <Route path="/"            element={<Dashboard />} />
            <Route path="/trading"     element={<ChatTrading />} />
            <Route path="/gestion"     element={<ChatGestion />} />
            <Route path="/backtesting" element={<ChatBacktesting />} />
            <Route path="/sessions"    element={<Sessions />} />
            <Route path="/rules"       element={<Rules />} />
          </Routes>
        </PageBurjWrapper>
      </main>
    </>
  );
}

export default function App() {
  const [phase, setPhase] = useState('checking');
  const [showOpeningBurj, setShowOpeningBurj] = useState(true);

  useEffect(() => {
    getAuthStatus()
      .then((res) => {
        if (!res.authenticated) return setPhase('login');
        // Si ya hay trader elegido, ir a splash
        if (getCurrentTrader()) setPhase('splash');
        else setPhase('trader-picker');
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
    const failsafe = setTimeout(() => setPhase('app'), 5000);
    return () => clearTimeout(failsafe);
  }, [phase]);

  function handleSwitchTrader() {
    clearCurrentTrader();
    setPhase('trader-picker');
  }

  if (phase === 'checking') {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        background: 'radial-gradient(circle at center, #2e2e2e 0%, #050505 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'rgba(255,255,255,0.4)', fontSize: 11, letterSpacing: '0.3em'
      }}>VERIFICANDO ACCESO...</div>
    );
  }

  if (phase === 'login') {
    return <LoginScreen onSuccess={() => setPhase('trader-picker')} />;
  }

  if (phase === 'trader-picker') {
    return <TraderPicker onSelect={() => setPhase('splash')} />;
  }

  if (phase === 'splash') {
    return <SplashScreen mode="auto" onEnter={() => setPhase('app')} />;
  }

  return (
    <BrowserRouter>
      <div className="blueprint-grid" />
      <div className="app-shell">
        <IntroAudio />
        {showOpeningBurj && (
          <BurjLoader size="large" duration={2400} onDone={() => setShowOpeningBurj(false)} />
        )}
        <AppContent onLogout={() => setPhase('login')} onSwitchTrader={handleSwitchTrader} />
      </div>
    </BrowserRouter>
  );
}
