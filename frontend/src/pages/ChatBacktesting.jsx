import ChatPanel from '../components/ChatPanel';
export default function ChatBacktesting() {
  return (
    <ChatPanel
      kind="backtesting"
      useTrader={false}
      title="📊 CHAT BACKTESTING v18"
      subtitle="Compartido · 35 trades · +$9,865 · WR 53.3%"
      color="#f7c66b"
      placeholder="Dicta un trade nuevo o pregunta estadísticas del backtest."
    />
  );
}
