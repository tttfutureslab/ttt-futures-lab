import { useEffect, useState } from 'react';
import { getTraders } from '../lib/api';
import { setCurrentTrader } from '../lib/traderContext';
import './TraderPicker.css';

export default function TraderPicker({ onSelect }) {
  const [traders, setTraders] = useState([]);

  useEffect(() => {
    getTraders().then(setTraders).catch(() => setTraders([
      { slug: 'adri', display_name: 'ADRI', color: '#6cd97e' },
      { slug: 'juanka', display_name: 'JUANKA', color: '#a3c8ff' }
    ]));
  }, []);

  function pick(slug) {
    setCurrentTrader(slug);
    onSelect?.(slug);
  }

  return (
    <div className="trader-picker">
      <div className="trader-picker-inner">
        <div className="trader-picker-title">¿QUIÉN ERES?</div>
        <div className="trader-picker-sub">Selecciona tu identidad para continuar</div>
        <div className="trader-cards">
          {traders.map((t) => (
            <button
              key={t.slug}
              className="trader-card"
              style={{ '--trader-color': t.color }}
              onClick={() => pick(t.slug)}
            >
              <div className="trader-avatar" style={{ background: t.color + '20', border: '1px solid ' + t.color }}>
                <span style={{ color: t.color }}>{t.display_name.charAt(0)}</span>
              </div>
              <div className="trader-name" style={{ color: t.color }}>{t.display_name}</div>
              <div className="trader-card-arrow">→</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
