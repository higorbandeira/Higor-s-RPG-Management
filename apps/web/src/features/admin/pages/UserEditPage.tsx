import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { http } from "@/shared/api/http";
import { useAuth } from "@/app/providers/AuthProvider";

type User = {
  id: string;
  nickname: string;
  role: "USER" | "ADMIN";
  isActive: boolean;
};

export function UserEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [user, setUser] = useState<User | null>(null);
  const [nickname, setNickname] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const res = await http.get(`/admin/users/${id}`);
      const u = res.data as User;
      setUser(u);
      setNickname(u.nickname);
      setIsActive(u.isActive);
    }
    load().catch(() => setError("Usuário não encontrado"));
  }, [id]);

  async function save() {
    if (!id) return;
    setError(null);
    setBusy(true);
    try {
      await http.patch(`/admin/users/${id}`, {
        nickname,
        isActive,
        password: password ? password : undefined,
      });
      navigate("/admin/users");
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Falha ao salvar");
    } finally {
      setBusy(false);
    }
  }

  if (!user) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background: "#f5f5f5",
          fontFamily: "'Inter', 'Roboto', system-ui, sans-serif",
        }}
      >
        <div style={{ color: "#616161" }}>{error ?? "Carregando..."}</div>
      </div>
    );
  }

  const pageStyle = {
    minHeight: "100vh",
    background: "#f5f5f5",
    padding: "32px 24px 64px",
    fontFamily: "'Inter', 'Roboto', system-ui, sans-serif",
  };
  const containerStyle = { maxWidth: 760, margin: "0 auto", display: "grid", gap: 24 };
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
  const buttonStyle = {
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
            <h1 style={{ margin: 0, fontSize: 28 }}>Editar USER</h1>
            <p style={{ marginTop: 8, color: "#616161" }}>Atualize dados, status e senha do usuário.</p>
          </div>
          <button onClick={logout} style={ghostButtonStyle}>
            Sair
          </button>
        </div>

        <div style={cardStyle}>
          <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 12, alignItems: "center" }}>
            <label style={labelStyle}>Nickname</label>
            <input value={nickname} onChange={(e) => setNickname(e.target.value)} style={inputStyle} />

            <label style={labelStyle}>Status</label>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 600 }}>
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              {isActive ? "Ativo" : "Inativo"}
            </label>

            <label style={labelStyle}>Nova senha (reset)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Deixe vazio para não alterar"
              style={inputStyle}
            />
          </div>

          {error && <div style={{ marginTop: 12, color: "#b00020" }}>{error}</div>}

          <div style={{ marginTop: 12, display: "flex", gap: 12 }}>
            <button onClick={() => navigate("/admin/users")} style={ghostButtonStyle}>
              Voltar
            </button>
            <button onClick={save} disabled={busy} style={{ ...buttonStyle, opacity: busy ? 0.7 : 1 }}>
              {busy ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
