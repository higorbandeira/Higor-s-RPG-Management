// apps/web/src/features/admin/pages/UsersListPage.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { http } from "../../../shared/http";

type User = {
  id: string;
  nickname: string;
  isActive: boolean;
};

export function UsersListPage() {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    http.get("/admin/users").then(r => setUsers(r.data.items));
  }, []);

  return (
    <div style={{ padding: 32 }}>
      <h1>Usuários</h1>

      <ul>
        {users.map(u => (
          <li key={u.id}>
            {u.nickname} — {u.isActive ? "Ativo" : "Inativo"} —
            <Link to={`/admin/users/${u.id}`}> editar</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
