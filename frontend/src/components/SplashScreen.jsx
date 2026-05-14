import { useEffect, useRef, useState } from 'react';
import './SplashScreen.css';

/**
 * Splash retro-futurista.
 * Props:
 *   mode: 'auto' (3 seg → onEnter) | 'tap' (espera click del usuario)
 *   onEnter: callback al terminar
 */
export default function SplashScreen({ mode = 'auto', onEnter }) {
  const [exiting, setExiting] = useState(false);
  const hourRef = useRef(null);
  const minuteRef = useRef(null);
  const secondRef = useRef(null);
  const clockRef = useRef(null);
  const microscopeRef = useRef(null);
  const mainTextRef = useRef(null);
  const ringsRef = useRef([]);

  // Reloj en tiempo real
  useEffect(() => {
    let raf;
    function tick() {
      const now = new Date();
      const h = now.getHours() % 12;
      const m = now.getMinutes();
      const s = now.getSeconds();
      const ms = now.getMilliseconds();
      if (hourRef.current) hourRef.current.setAttribute('transform', `rotate(${(h + m / 60) * 30} 250 250)`);
      if (minuteRef.current) minuteRef.current.setAttribute('transform', `rotate(${(m + s / 60) * 6} 250 250)`);
      if (secondRef.current) secondRef.current.setAttribute('transform', `rotate(${(s + ms / 1000) * 6} 250 250)`);
      raf = requestAnimationFrame(tick);
    }
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);

  // Parallax suave
  useEffect(() => {
    let target = { x: 0, y: 0 };
    let current = { x: 0, y: 0 };
    let raf;

    const onMove = (e) => {
      const touch = e.touches ? e.touches[0] : e;
      target.x = touch.clientX / window.innerWidth - 0.5;
      target.y = touch.clientY / window.innerHeight - 0.5;
    };

    function animate() {
      current.x += (target.x - current.x) * 0.05;
      current.y += (target.y - current.y) * 0.05;
      if (clockRef.current) clockRef.current.style.transform = `translate(${current.x * -25}px, ${current.y * -25}px)`;
      if (microscopeRef.current) microscopeRef.current.style.transform = `translate(${current.x * 35}px, ${current.y * 35}px)`;
      if (mainTextRef.current) mainTextRef.current.style.transform = `translate(${current.x * 12}px, ${current.y * 12}px)`;
      ringsRef.current.forEach((ring, i) => {
        if (!ring) return;
        const d = (i + 1) * 15;
        ring.style.transform = `translate(calc(-50% + ${current.x * d}px), calc(-50% + ${current.y * d}px))`;
      });
      raf = requestAnimationFrame(animate);
    }
    animate();
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
    };
  }, []);

  // Auto-dismiss en modo 'auto'
  useEffect(() => {
    if (mode !== 'auto') return;
    const t = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onEnter?.(), 700);
    }, 3200);
    return () => clearTimeout(t);
  }, [mode, onEnter]);

  // Particles
  const particles = Array.from({ length: 50 }).map((_, i) => {
    const size = Math.random() * 3 + 1;
    return (
      <div
        key={i}
        className="particle"
        style={{
          left: `${Math.random() * 100}vw`,
          width: `${size}px`,
          height: `${size}px`,
          animationDuration: `${Math.random() * 20 + 15}s`,
          animationDelay: `${Math.random() * -30}s`,
          opacity: Math.random() * 0.4 + 0.1
        }}
      />
    );
  });

  function handleTap() {
    if (mode !== 'tap') return;
    setExiting(true);
    setTimeout(() => onEnter?.(), 700);
  }

  return (
    <div className={`splash ${exiting ? 'splash-exiting' : ''}`} onClick={handleTap}>
      <div className="splash-overlay" />
      <div className="splash-glow" />

      {/* Rings */}
      <div className="tech-ring ring-1" ref={(el) => (ringsRef.current[0] = el)}>
        <div className="ring-wrapper" />
      </div>
      <div className="tech-ring ring-2" ref={(el) => (ringsRef.current[1] = el)}>
        <div className="ring-wrapper" />
      </div>
      <div className="tech-ring ring-3" ref={(el) => (ringsRef.current[2] = el)}>
        <div className="ring-wrapper" />
      </div>

      {/* Particles */}
      <div className="particles">{particles}</div>

      {/* Clock */}
      <div className="graphic-container clock-container" ref={clockRef}>
        <svg viewBox="0 0 500 500" width="100%" height="100%" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2">
          <g className="gear-slow">
            <circle cx="250" cy="250" r="240" strokeWidth="4" strokeDasharray="10 15" />
            <circle cx="250" cy="250" r="225" strokeWidth="1" strokeDasharray="2 6" />
          </g>
          <circle cx="250" cy="250" r="210" strokeWidth="2" stroke="rgba(255,255,255,0.4)" />
          <g className="gear-medium">
            <circle cx="250" cy="250" r="180" strokeDasharray="8 12" strokeWidth="25" stroke="rgba(255,255,255,0.5)" />
            <circle cx="250" cy="250" r="160" strokeWidth="2" />
            <line x1="250" y1="50" x2="250" y2="450" strokeWidth="2" stroke="rgba(255,255,255,0.3)" />
            <line x1="50" y1="250" x2="450" y2="250" strokeWidth="2" stroke="rgba(255,255,255,0.3)" />
            <line x1="108" y1="108" x2="392" y2="392" strokeWidth="2" stroke="rgba(255,255,255,0.3)" />
            <line x1="108" y1="392" x2="392" y2="108" strokeWidth="2" stroke="rgba(255,255,255,0.3)" />
          </g>
          <g className="gear-fast-reverse">
            <circle cx="250" cy="250" r="120" strokeDasharray="30 15" strokeWidth="8" stroke="rgba(255,255,255,0.7)" />
            <circle cx="250" cy="250" r="110" strokeWidth="1" />
            <circle cx="250" cy="250" r="95" strokeDasharray="2 8" strokeWidth="15" stroke="rgba(255,255,255,0.4)" />
          </g>
          <circle cx="250" cy="250" r="30" strokeWidth="2" />
          <circle cx="250" cy="250" r="15" fill="rgba(255,255,255,0.2)" />
          <g>
            <line ref={hourRef} x1="250" y1="250" x2="250" y2="140" strokeWidth="12" strokeLinecap="round" stroke="#fff" />
            <line ref={minuteRef} x1="250" y1="250" x2="250" y2="90" strokeWidth="8" strokeLinecap="round" stroke="#fff" />
            <line ref={secondRef} x1="250" y1="250" x2="250" y2="50" strokeWidth="3" strokeLinecap="round" stroke="#d0d0d0" />
            <circle cx="250" cy="250" r="10" fill="#fff" stroke="none" />
          </g>
        </svg>
      </div>

      {/* Main text */}
      <div className="splash-content" ref={mainTextRef}>
        <h1>TTT Futures Lab</h1>
        <h2>Engineers of Time Levels Theorem</h2>
        {mode === 'tap' && <p className="tap-hint">— TAP TO ENTER —</p>}
      </div>

      {/* Microscope */}
      <div className="graphic-container microscope-container" ref={microscopeRef}>
        <svg viewBox="0 0 500 500" width="100%" height="100%" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
          <circle cx="200" cy="340" r="45" strokeWidth="2" className="gear-slow" strokeDasharray="10 15" stroke="rgba(255,255,255,0.5)" />
          <circle cx="200" cy="340" r="65" strokeWidth="2" className="gear-fast-reverse" strokeDasharray="5 20" stroke="rgba(255,255,255,0.3)" />
          <path d="M 120 450 L 380 450 L 350 380 L 150 380 Z" strokeWidth="6" />
          <path d="M 150 380 L 350 380 L 320 340 L 180 340 Z" strokeWidth="4" />
          <path d="M 320 340 C 450 250, 450 100, 250 100" strokeWidth="16" />
          <path d="M 290 340 C 400 250, 400 130, 250 130" strokeWidth="5" stroke="rgba(255,255,255,0.6)" />
          <line x1="120" y1="250" x2="280" y2="250" strokeWidth="12" />
          <rect x="250" y="235" width="25" height="40" />
          <line x1="275" y1="260" x2="310" y2="260" strokeWidth="8" />
          <line x1="250" y1="100" x2="180" y2="50" strokeWidth="20" />
          <rect x="150" y="20" width="50" height="25" fill="rgba(255,255,255,0.05)" strokeWidth="5" transform="rotate(-35 175 32)" />
          <path d="M 220 160 L 280 160 L 270 190 L 230 190 Z" strokeWidth="5" />
          <path d="M 240 190 L 230 240 L 250 240 Z" strokeWidth="5" />
          <path d="M 260 190 L 270 230 L 280 230 Z" strokeWidth="5" />
          <g className="knob-spin">
            <circle cx="340" cy="240" r="35" strokeDasharray="8 8" strokeWidth="8" stroke="rgba(255,255,255,0.7)" />
            <circle cx="340" cy="240" r="15" strokeWidth="4" />
            <circle cx="340" cy="240" r="6" strokeWidth="2" />
          </g>
          <circle cx="200" cy="320" r="30" strokeWidth="5" />
          <line x1="200" y1="350" x2="200" y2="370" strokeWidth="6" />
          <line x1="170" y1="370" x2="230" y2="370" strokeWidth="6" />
          <polygon points="200,290 130,190 270,190" fill="rgba(255,255,255,0.03)" stroke="none" />
          <line x1="130" y1="190" x2="270" y2="190" className="scan-line" stroke="rgba(255,255,255,0.6)" />
        </svg>
      </div>
    </div>
  );
}
