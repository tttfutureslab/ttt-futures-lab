import ChatPanel from '../components/ChatPanel';
export default function ChatBacktesting() {
  return (
    <ChatPanel
      kind="backtesting"
      title="📊 CHAT BACKTESTING v18"
      subtitle="35 trades registrados · +$9,865 · WR 53.3%"
      color="#f7c66b"
      placeholder="Dicta un trade nuevo ('#36 London Q4 TP') o pregunta estadísticas del backtest."
    />
  );
}
