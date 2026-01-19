import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { http } from "@/shared/api/http";

type User = {
  id: string;
  nickname: string;
  role: "USER" | "ADMIN";
  isActive: boolean;
};

export function UsersListPage() {
  const { logout } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await http.get("/admin/users");
    setUsers(res.data.items as User[]);
  }

  useEffect(() => {
    load();
  }, []);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nickname.trim() || !password) {
      setError("Nickname e senha são obrigatórios");
      return;
    }

    setBusy(true);
    try {
      await http.post("/admin/users", { nickname, password });
      setNickname("");
      setPassword("");
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Falha ao criar usuário");
    } finally {
      setBusy(false);
    }
  }

  const pageStyle = {
    minHeight: "100vh",
    background: "#f5f5f5",
    padding: "32px 24px 64px",
    fontFamily: "'Inter', 'Roboto', system-ui, sans-serif",
  };
  const containerStyle = { maxWidth: 980, margin: "0 auto", display: "grid", gap: 24 };
  const cardStyle = {
    background: "#ffffff",
    borderRadius: 20,
    padding: 20,
    border: "1px solid #e4e4e4",
    boxShadow: "0 16px 40px rgba(0,0,0,0.08)",
  };
  const labelStyle = { fontSize: 13, fontWeight: 600, color: "#424242" };
  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid #d0d0d0",
    fontSize: 14,
  };
  const primaryButtonStyle = {
    padding: "10px 18px",
    borderRadius: 999,
    border: "none",
    background: "#111111",
    color: "#ffffff",
    fontWeight: 600,
    cursor: "pointer",
  };
  const ghostButtonStyle = {
    padding: "10px 18px",
    borderRadius: 999,
    border: "1px solid #111111",
    background: "transparent",
    color: "#111111",
    fontWeight: 600,
    cursor: "pointer",
  };

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28 }}>Painel Admin</h1>
            <p style={{ marginTop: 8, color: "#616161" }}>Gerencie usuários e permissões com segurança.</p>
          </div>
          <button onClick={logout} style={ghostButtonStyle}>
            Sair
          </button>
        </div>

        <div style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Criar USER</h2>
          <form onSubmit={createUser}>
            <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12, alignItems: "center" }}>
              <label style={labelStyle}>Nickname</label>
              <input value={nickname} onChange={(e) => setNickname(e.target.value)} style={inputStyle} />

              <label style={labelStyle}>Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
              />
            </div>

            {error && <div style={{ marginTop: 12, color: "#b00020" }}>{error}</div>}

            <button type="submit" disabled={busy} style={{ ...primaryButtonStyle, marginTop: 12, opacity: busy ? 0.7 : 1 }}>
              {busy ? "Criando..." : "Criar"}
            </button>
          </form>
        </div>

        <div style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Usuários</h2>
          <div style={{ border: "1px solid #efefef", borderRadius: 16, overflow: "hidden" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 120px 140px",
                padding: 12,
                fontWeight: 600,
                background: "#fafafa",
                borderBottom: "1px solid #eee",
              }}
            >
              <div>Nickname</div>
              <div>Status</div>
              <div></div>
            </div>
            {users.map((u) => (
              <div
                key={u.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 120px 140px",
                  padding: 12,
                  borderBottom: "1px solid #f2f2f2",
                  alignItems: "center",
                }}
              >
                <div>{u.nickname}</div>
                <div
                  style={{
                    color: u.isActive ? "#0a7d2c" : "#b00020",
                    fontWeight: 600,
                  }}
                >
                  {u.isActive ? "Ativo" : "Inativo"}
                </div>
                <div>
                  {u.role === "USER" ? (
                    <Link to={`/admin/users/${u.id}`} style={{ color: "#111111", fontWeight: 600 }}>
                      Editar
                    </Link>
                  ) : (
                    <span style={{ opacity: 0.6 }}>ADMIN</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
