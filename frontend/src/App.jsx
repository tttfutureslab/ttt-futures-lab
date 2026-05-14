import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SplashScreen from './components/SplashScreen';
import AppHeader from './components/AppHeader';
import Dashboard from './pages/Dashboard';
import UploadShot from './pages/UploadShot';
import Rules from './pages/Rules';
import Chat from './pages/Chat';
import History from './pages/History';

export default function App() {
  // Flujo: 'auto-splash' (3s) → 'tap-splash' (espera click) → 'app'
  const [phase, setPhase] = useState('auto-splash');

  if (phase === 'auto-splash') {
    return <SplashScreen mode="auto" onEnter={() => setPhase('tap-splash')} />;
  }
  if (phase === 'tap-splash') {
    return <SplashScreen mode="tap" onEnter={() => setPhase('app')} />;
  }

  return (
    <BrowserRouter>
      <div className="blueprint-grid" />
      <div className="app-shell">
        <AppHeader />
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
