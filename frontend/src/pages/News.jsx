import { useEffect, useState } from 'react';
import './News.css';

const API = '/api';

const fmtDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleString('es-ES', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const fmtDay = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
};

export default function News() {
  const [events, setEvents] = useState([]);
  const [lastFetch, setLastFetch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${API}/economic-calendar`, { credentials: 'include' });
      if (!r.ok) throw new Error('Error cargando eventos');
      const j = await r.json();
      setEvents(j.events || []);
      setLastFetch(j.last_fetch);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  async function handleRefresh() {
    if (!confirm('¿Forzar descarga ahora? Forex Factory limita las descargas y puede fallar si abusas.')) return;
    setRefreshing(true);
    try {
      const r = await fetch(`${API}/economic-calendar/refresh`, {
        method: 'POST',
        credentials: 'include'
      });
      const j = await r.json();
      if (j.status !== 'success') {
        alert(`Descarga: ${j.status}\n${j.errorMsg || ''}`);
      }
      await load();
    } catch (e) {
      alert('Error: ' + e.message);
    }
    setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  // Agrupar eventos por día
  const eventsByDay = {};
  for (const e of events) {
    const dayKey = new Date(e.event_at).toISOString().slice(0, 10);
    if (!eventsByDay[dayKey]) eventsByDay[dayKey] = [];
    eventsByDay[dayKey].push(e);
  }

  const days = Object.keys(eventsByDay).sort();

  if (loading) return <div className="news-loading">Cargando eventos...</div>;

  return (
    <div className="news-container">
      <header className="news-header">
        <div>
          <h1>📅 NOTICIAS ECONÓMICAS</h1>
          <p className="news-sub">USA · Impacto Alto/Medio · Forex Factory</p>
        </div>
        <div className="news-actions">
          {lastFetch && (
            <div className="news-last-fetch">
              Última: {fmtDate(lastFetch.fetched_at)} · {lastFetch.events_count || 0} eventos
              {lastFetch.status !== 'success' && <span className="news-status-error"> · {lastFetch.status}</span>}
            </div>
          )}
          <button className="news-btn-refresh" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? 'Descargando...' : '↻ Refresh'}
          </button>
        </div>
      </header>

      {error && <div className="news-error">Error: {error}</div>}

      {days.length === 0 ? (
        <div className="news-empty">
          <p>No hay eventos cacheados.</p>
          <p>Pulsa "Refresh" para descargar de Forex Factory.</p>
        </div>
      ) : (
        days.map((day) => (
          <div key={day} className="news-day-block">
            <h2 className="news-day-title">{fmtDay(day)}</h2>
            <div className="news-events">
              {eventsByDay[day].map((e) => (
                <EventRow key={e.id} event={e} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function EventRow({ event }) {
  const timeStr = new Date(event.event_at).toLocaleTimeString('es-ES', {
    hour: '2-digit', minute: '2-digit'
  });
  const impactClass = `impact-${event.impact?.toLowerCase()}`;
  const hasActual = event.actual !== null && event.actual !== undefined && event.actual !== '';

  return (
    <div className={`news-event ${impactClass}`}>
      <div className="news-event-time">{timeStr}</div>
      <div className={`news-event-impact ${impactClass}`}>{event.impact}</div>
      <div className="news-event-title">{event.event_title}</div>
      <div className="news-event-values">
        {event.forecast && <span className="news-val"><span className="news-val-label">F:</span> {event.forecast}</span>}
        {event.previous && <span className="news-val"><span className="news-val-label">P:</span> {event.previous}</span>}
        {hasActual && <span className="news-val news-val-actual"><span className="news-val-label">A:</span> {event.actual}</span>}
      </div>
    </div>
  );
}
