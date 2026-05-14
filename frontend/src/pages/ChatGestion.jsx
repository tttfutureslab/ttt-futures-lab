import ChatPanel from '../components/ChatPanel';
export default function ChatGestion() {
  return (
    <ChatPanel
      kind="gestion"
      title="💼 CHAT GESTIÓN"
      subtitle="Cuentas prop firms · Drawdown · Consistencia · Payouts"
      color="#a3c8ff"
      placeholder="Pega una captura del dashboard de tu prop firm, o dime cómo va tu cuenta hoy."
    />
  );
}
