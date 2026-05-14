import { useState, useRef, useEffect } from 'react';
import { sendChat } from '../lib/api';

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}`);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setMessages((m) => [...m, { role: 'user', content: msg }]);
    setInput('');
    setLoading(true);
    try {
      const res = await sendChat(sessionId, msg);
      setMessages((m) => [...m, { role: 'assistant', content: res.message }]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', content: '⚠ Error: ' + e.message }]);
    }
    setLoading(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 160px)' }}>
      <h2 className="panel-title">Chat con asistente TTT</h2>

      <div className="panel" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 && (
          <p style={{ color: 'var(--silver-dim)', textAlign: 'center', marginTop: 40, fontSize: 13 }}>
            Pregunta lo que necesites sobre normas de prop firms, gestión de cuentas, o análisis ICT.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '85%',
            padding: '10px 14px',
            borderRadius: 10,
            background: m.role === 'user' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
            border: '1px solid var(--silver-line)',
            fontSize: 14,
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap'
          }}>
            {m.content}
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start', padding: '10px 14px', color: 'var(--silver-dim)', fontSize: 13 }}>
            ◌ Pensando...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
          placeholder="Escribe tu pregunta..."
          disabled={loading}
        />
        <button className="btn btn-primary" onClick={handleSend} disabled={loading || !input.trim()}>
          Enviar
        </button>
      </div>
    </div>
  );
}
