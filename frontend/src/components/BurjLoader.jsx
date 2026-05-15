import { useEffect, useState } from 'react';

export default function BurjLoader({ size = 'medium', duration = 2000, onDone }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, duration);
    return () => clearTimeout(t);
  }, [duration, onDone]);

  if (!visible) return null;

  const sizes = { small: 90, medium: 200, large: 360 };
  const w = sizes[size] || sizes.medium;
  const h = w * 1.9;

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: size === 'large' ? 28 : 14,
        background: 'rgba(5, 5, 8, 0.92)',
        backdropFilter: 'blur(14px)',
        zIndex: 9999,
        animation: 'burjFade 2s ease-out forwards',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          fontSize: size === 'large' ? 28 : size === 'small' ? 11 : 18,
          letterSpacing: size === 'large' ? '0.5em' : '0.35em',
          fontWeight: 300,
          background: 'linear-gradient(180deg, #ffffff 0%, #e8e8f0 40%, #a8a8b8 100%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
          textShadow: '0 0 30px rgba(220,220,235,0.4)',
          animation: 'burjTextGlow 2.4s ease-in-out infinite',
          paddingLeft: size === 'large' ? '0.5em' : '0.35em',
        }}
      >
        WORLD IS YOURS
      </div>

      <svg
        width={w}
        height={h}
        viewBox="0 0 200 380"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: 'drop-shadow(0 0 20px rgba(220, 220, 235, 0.4))' }}
      >
        <defs>
          <linearGradient id="burjSilver" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="15%" stopColor="#f0f0f8" />
            <stop offset="45%" stopColor="#c8c8d4" />
            <stop offset="80%" stopColor="#787888" />
            <stop offset="100%" stopColor="#4a4a5a" />
          </linearGradient>
          <linearGradient id="burjShadow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.3)" />
          </linearGradient>
          <linearGradient id="burjHighlight" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          <linearGradient id="shimmer" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.85)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          <clipPath id="burjClip">
            <path d="M 100,8 L 100,30 L 98,45 L 102,45 L 102,70 L 96,72 L 104,72 L 104,95 L 93,98 L 107,98 L 107,118 L 90,122 L 110,122 L 110,142 L 87,148 L 113,148 L 113,170 L 83,178 L 117,178 L 117,200 L 79,210 L 121,210 L 121,232 L 75,244 L 125,244 L 125,266 L 70,280 L 130,280 L 130,302 L 64,318 L 136,318 L 136,340 L 56,360 L 144,360 L 144,372 L 56,372 Z"/>
          </clipPath>
        </defs>

        <path
          d="M 100,8 L 100,30 L 98,45 L 102,45 L 102,70 L 96,72 L 104,72 L 104,95 L 93,98 L 107,98 L 107,118 L 90,122 L 110,122 L 110,142 L 87,148 L 113,148 L 113,170 L 83,178 L 117,178 L 117,200 L 79,210 L 121,210 L 121,232 L 75,244 L 125,244 L 125,266 L 70,280 L 130,280 L 130,302 L 64,318 L 136,318 L 136,340 L 56,360 L 144,360 L 144,372 L 56,372 Z"
          fill="url(#burjSilver)"
          stroke="#d8d8e4"
          strokeWidth="0.6"
        />

        <path
          d="M 100,8 L 100,372 L 144,372 L 144,360 L 136,340 L 136,318 L 130,302 L 130,280 L 125,266 L 125,244 L 121,232 L 121,210 L 117,200 L 117,178 L 113,170 L 113,148 L 110,142 L 110,122 L 107,118 L 107,98 L 104,95 L 104,72 L 102,70 L 102,45 L 100,30 Z"
          fill="url(#burjShadow)"
        />

        <path
          d="M 100,8 L 100,30 L 98,45 L 102,45 L 96,72 L 93,98 L 90,122 L 87,148 L 83,178 L 79,210 L 75,244 L 70,280 L 64,318 L 56,360 L 56,372 Z"
          fill="url(#burjHighlight)"
        />

        <g stroke="rgba(255,255,255,0.12)" strokeWidth="0.4" fill="none">
          {[40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300, 320, 340].map(y => (
            <line key={y} x1="60" y1={y} x2="140" y2={y} clipPath="url(#burjClip)" />
          ))}
        </g>

        <line x1="100" y1="0" x2="100" y2="8" stroke="#f0f0f8" strokeWidth="0.8" />

        <rect
          x="40"
          y="-60"
          width="120"
          height="50"
          fill="url(#shimmer)"
          clipPath="url(#burjClip)"
          style={{ animation: 'burjShimmer 2.4s ease-in-out infinite' }}
        />

        <circle cx="100" cy="22" r="1.2" fill="#fff" style={{ animation: 'burjSparkle 1.8s ease-in-out infinite 0.0s' }} />
        <circle cx="102" cy="60" r="1" fill="#fff" style={{ animation: 'burjSparkle 1.8s ease-in-out infinite 0.4s' }} />
        <circle cx="96" cy="100" r="0.9" fill="#fff" style={{ animation: 'burjSparkle 1.8s ease-in-out infinite 0.8s' }} />
        <circle cx="105" cy="155" r="1.1" fill="#fff" style={{ animation: 'burjSparkle 1.8s ease-in-out infinite 1.2s' }} />
        <circle cx="92" cy="220" r="0.9" fill="#fff" style={{ animation: 'burjSparkle 1.8s ease-in-out infinite 1.6s' }} />

        <ellipse cx="100" cy="376" rx="44" ry="3" fill="rgba(0,0,0,0.4)" />
      </svg>

      <style>{`
        @keyframes burjShimmer {
          0%   { transform: translateY(0); opacity: 0; }
          15%  { opacity: 1; }
          85%  { opacity: 1; }
          100% { transform: translateY(440px); opacity: 0; }
        }
        @keyframes burjSparkle {
          0%, 100% { opacity: 0; r: 0.3; }
          50%      { opacity: 1; r: 1.5; }
        }
        @keyframes burjFade {
          0%   { opacity: 0; }
          12%  { opacity: 1; }
          82%  { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes burjTextGlow {
          0%, 100% { text-shadow: 0 0 20px rgba(220,220,235,0.3); }
          50%      { text-shadow: 0 0 40px rgba(255,255,255,0.7), 0 0 60px rgba(180,180,210,0.4); }
        }
      `}</style>
    </div>
  );
}
