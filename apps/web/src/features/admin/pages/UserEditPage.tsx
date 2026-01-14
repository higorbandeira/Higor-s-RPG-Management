// apps/web/src/features/admin/pages/UserEditPage.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { http } from "../../../shared/http";

export function UserEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    http.get("/admin/users").then(r => {
      const user = r.data.items.find((u: any) => u.id === id);
      if (user) {
        setNickname(user.nickname);
        setIsActive(user.isActive);
      }
    });
  }, [id]);

  async function save() {
    await http.patch(`/admin/users/${id}`, {
      nickname,
      password: password || undefined,
      isActive
    });
    navigate("/admin/users");
  }

  return (
    <div style={{ padding: 32 }}>
      <h1>Editar Usuário</h1>

      <div>
        <label>Nickname</label>
        <input value={nickname} onChange={e => setNickname(e.target.value)} />
      </div>

      <div>
        <label>Nova senha</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
      </div>

      <div>
        <label>
          <input
            type="checkbox"
            checked={isActive}
            onChange={e => setIsActive(e.target.checked)}
          />
          Ativo
        </label>
      </div>

      <button onClick={save}>Salvar</button>
    </div>
  );
}
