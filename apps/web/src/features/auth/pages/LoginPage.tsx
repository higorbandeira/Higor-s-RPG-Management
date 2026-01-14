// apps/web/src/features/auth/pages/LoginPage.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../app/providers/AuthProvider";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await login(nickname, password);
      navigate("/");
    } catch {
      setError("Credenciais inválidas");
    }
  }

  return (
    <div style={{ padding: 32 }}>
      <h1>Login</h1>

      <form onSubmit={handleSubmit}>
        <div>
          <label>Nickname</label>
          <input value={nickname} onChange={e => setNickname(e.target.value)} />
        </div>

        <div>
          <label>Senha</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
        </div>

        {error && <p style={{ color: "red" }}>{error}</p>}

        <button type="submit">Entrar</button>
      </form>
    </div>
  );
}
