import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { http } from "@/shared/api/http";

type User = {
  id: string;
  nickname: string;
  role: "USER" | "ADMIN";
  isActive: boolean;
};

export function UserEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

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
    return <div style={{ padding: 24 }}>{error ?? "Carregando..."}</div>;
  }

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ marginTop: 0 }}>Editar USER</h1>

      <div style={{ padding: 16, border: "1px solid #eee", borderRadius: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 12, alignItems: "center" }}>
          <label>Nickname</label>
          <input value={nickname} onChange={(e) => setNickname(e.target.value)} />

          <label>Status</label>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            {isActive ? "Ativo" : "Inativo"}
          </label>

          <label>Nova senha (reset)</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Deixe vazio para não alterar"
          />
        </div>

        {error && <div style={{ marginTop: 12, color: "crimson" }}>{error}</div>}

        <div style={{ marginTop: 12, display: "flex", gap: 12 }}>
          <button onClick={() => navigate("/admin/users")}>Voltar</button>
          <button onClick={save} disabled={busy}>
            {busy ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
