import { useEffect, useState } from 'react';
import './NewsBanner.css';

const API = '/api';

export default function NewsBanner() {
  const [events, setEvents] = useState([]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const r = await fetch(`${API}/economic-calendar/upcoming?minutes=60`, { credentials: 'include' });
        if (!r.ok) return;
        const j = await r.json();
        if (active) setEvents(j.events || []);
      } catch (e) { /* silencioso */ }
    }
    load();
    const interval = setInterval(load, 60000); // cada 60s
    const tick = setInterval(() => setNow(Date.now()), 1000); // cuenta atrás cada 1s
    return () => { active = false; clearInterval(interval); clearInterval(tick); };
  }, []);

  if (!events || events.length === 0) return null;

  return (
    <div className="news-banner">
      <div className="news-banner-icon">⚠️</div>
      <div className="news-banner-content">
        <div className="news-banner-title">NOTICIA HIGH IMPACT EN BREVE</div>
        <div className="news-banner-events">
          {events.slice(0, 3).map((e) => {
            const eventTime = new Date(e.event_at).getTime();
            const minsLeft = Math.max(0, Math.round((eventTime - now) / 60000));
            const timeStr = new Date(e.event_at).toLocaleTimeString('es-ES', {
              hour: '2-digit', minute: '2-digit'
            });
            return (
              <div key={e.id} className="news-banner-item">
                <span className="news-banner-time">{timeStr}</span>
                <span className="news-banner-mins">
                  {minsLeft <= 0 ? 'AHORA' : `en ${minsLeft} min`}
                </span>
                <span className="news-banner-name">{e.event_title}</span>
                {e.forecast && <span className="news-banner-forecast">F: {e.forecast}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
