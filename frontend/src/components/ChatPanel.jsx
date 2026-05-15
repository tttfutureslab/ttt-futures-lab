import { useEffect, useRef, useState } from 'react';
import { getCurrentTrader } from '../lib/traderContext';
import './ChatPanel.css';

const API = '/api';

export default function ChatPanel({ kind, title, subtitle, placeholder, color = '#e8e8e8', useTrader = true }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [pendingImage, setPendingImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  // useTrader=true → trading/gestion. useTrader=false → backtest compartido.
  const traderSlug = useTrader ? getCurrentTrader() : null;

  function buildUrl(path) {
    const qs = traderSlug ? `?trader=${traderSlug}` : '';
    return `${API}${path}${qs}`;
  }

  useEffect(() => {
    fetch(buildUrl(`/chat/${kind}/history`), { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => setMessages(Array.isArray(data) ? data : []))
      .catch(() => setMessages([]));
  }, [kind, traderSlug]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  useEffect(() => {
    function handlePaste(e) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            setPendingImage({ file, preview: URL.createObjectURL(file) });
            e.preventDefault();
          }
        }
      }
    }
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  async function handleSend() {
    if ((!input.trim() && !pendingImage) || loading) return;
    const userMsg = {
      role: 'user',
      content: input.trim() || (pendingImage ? '(captura adjunta)' : ''),
      image_url: pendingImage?.preview || null
    };
    setMessages((m) => [...m, userMsg]);

    const formData = new FormData();
    formData.append('message', input.trim());
    if (pendingImage) formData.append('image', pendingImage.file);
    if (traderSlug) formData.append('trader_slug', traderSlug);

    setInput('');
    setPendingImage(null);
    setLoading(true);

    try {
      const res = await fetch(buildUrl(`/chat/${kind}/message`), {
        method: 'POST', body: formData, credentials: 'include'
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error || 'Error');
      }
      const data = await res.json();
      setMessages((m) => [...m, { role: 'assistant', content: data.message }]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', content: `Error: ${e.message}` }]);
    }
    setLoading(false);
  }

  async function handleClear() {
    if (!confirm('Borrar historial de este chat?')) return;
    await fetch(buildUrl(`/chat/${kind}/history`), { method: 'DELETE', credentials: 'include' });
    setMessages([]);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const traderLabel = traderSlug ? ` · ${traderSlug.toUpperCase()}` : '';

  return (
    <div className="chat-panel">
      <div className="chat-head" style={{ borderColor: `${color}33` }}>
        <div>
          <h2 className="chat-title" style={{ color }}>{title}{traderLabel}</h2>
          <p className="chat-subtitle">{subtitle}</p>
        </div>
        <button className="chat-clear" onClick={handleClear} title="Limpiar">↺</button>
      </div>

      <div className="chat-stream">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p>{placeholder}</p>
            <p className="chat-hint">Puedes pegar capturas con Ctrl+V</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`chat-bubble chat-${m.role}`}>
            {m.image_url && <img src={m.image_url} alt="captura" className="chat-image" />}
            {m.content && <div className="chat-text">{m.content}</div>}
          </div>
        ))}
        {loading && (
          <div className="chat-bubble chat-assistant chat-loading">
            <span className="dot" /><span className="dot" /><span className="dot" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {pendingImage && (
        <div className="chat-pending-image">
          <img src={pendingImage.preview} alt="adjunto" />
          <button onClick={() => setPendingImage(null)} className="chat-pending-remove">✕</button>
        </div>
      )}

      <div className="chat-input-row">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe o pega una captura (Ctrl+V)..."
          rows={2}
          disabled={loading}
        />
        <button className="btn btn-primary chat-send" onClick={handleSend} disabled={loading || (!input.trim() && !pendingImage)}>▶</button>
      </div>
    </div>
  );
}
