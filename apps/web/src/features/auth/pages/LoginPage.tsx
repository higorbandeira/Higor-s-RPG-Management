import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";

export function LoginPage() {
  const { login, me } = useAuth();
  const navigate = useNavigate();

  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (me) navigate("/", { replace: true });
  }, [me, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(nickname, password);
      navigate("/", { replace: true });
    } catch {
      setError("Nickname ou senha inválidos");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "72px auto", padding: 24, border: "1px solid #ddd", borderRadius: 12 }}>
      <h1 style={{ marginTop: 0 }}>Entrar</h1>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", marginBottom: 6 }}>Nickname</label>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Seu nickname"
            style={{ width: "100%", padding: 10 }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", marginBottom: 6 }}>Senha</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Sua senha"
            style={{ width: "100%", padding: 10 }}
          />
        </div>

        {error && (
          <div style={{ marginBottom: 12, color: "crimson" }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} style={{ width: "100%", padding: 10 }}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <p style={{ marginTop: 12, fontSize: 12, opacity: 0.75 }}>
        * Usuários são criados apenas pelo ADMIN.
      </p>
    </div>
  );
}
