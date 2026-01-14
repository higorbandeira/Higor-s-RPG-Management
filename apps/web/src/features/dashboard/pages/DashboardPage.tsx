// apps/web/src/features/dashboard/pages/DashboardPage.tsx
import { useAuth } from "../../../app/providers/AuthProvider";

export function DashboardPage() {
  const { me, logout } = useAuth();

  return (
    <div style={{ padding: 32 }}>
      <h1>Dashboard</h1>
      <p>Usuário: {me?.nickname}</p>

      <div style={{
        marginTop: 24,
        border: "1px dashed #aaa",
        height: 400,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <span>🧩 Grid do tabuleiro (placeholder)</span>
      </div>

      <button onClick={logout} style={{ marginTop: 24 }}>
        Sair
      </button>
    </div>
  );
}
