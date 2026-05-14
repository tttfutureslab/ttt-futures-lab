import ChatPanel from '../components/ChatPanel';
export default function ChatTrading() {
  return (
    <ChatPanel
      kind="trading"
      title="📈 CHAT TRADING"
      subtitle="Diario de trades reales · ICT · Validación v18"
      color="#6cd97e"
      placeholder="Pega una captura del trade que acabas de cerrar y dime si fue TP, SL o BE y por qué."
    />
  );
}
