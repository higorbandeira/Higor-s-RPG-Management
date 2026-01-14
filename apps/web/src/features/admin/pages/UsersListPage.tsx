import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { http } from "@/shared/api/http";

type User = {
  id: string;
  nickname: string;
  role: "USER" | "ADMIN";
  isActive: boolean;
};

export function UsersListPage() {
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

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ marginTop: 0 }}>Painel Admin</h1>

      <div style={{ padding: 16, border: "1px solid #eee", borderRadius: 12 }}>
        <h2 style={{ marginTop: 0 }}>Criar USER</h2>
        <form onSubmit={createUser}>
          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12, alignItems: "center" }}>
            <label>Nickname</label>
            <input value={nickname} onChange={(e) => setNickname(e.target.value)} />

            <label>Senha</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          {error && <div style={{ marginTop: 12, color: "crimson" }}>{error}</div>}

          <button type="submit" disabled={busy} style={{ marginTop: 12 }}>
            {busy ? "Criando..." : "Criar"}
          </button>
        </form>
      </div>

      <div style={{ marginTop: 24 }}>
        <h2>Usuários</h2>
        <div style={{ border: "1px solid #eee", borderRadius: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 140px", padding: 12, fontWeight: 600, borderBottom: "1px solid #eee" }}>
            <div>Nickname</div>
            <div>Status</div>
            <div></div>
          </div>
          {users.map((u) => (
            <div key={u.id} style={{ display: "grid", gridTemplateColumns: "1fr 120px 140px", padding: 12, borderBottom: "1px solid #f2f2f2" }}>
              <div>{u.nickname}</div>
              <div style={{ color: u.isActive ? "green" : "crimson" }}>{u.isActive ? "Ativo" : "Inativo"}</div>
              <div>
                {u.role === "USER" ? <Link to={`/admin/users/${u.id}`}>Editar</Link> : <span style={{ opacity: 0.6 }}>ADMIN</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
