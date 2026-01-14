import React, { createContext, useContext, useEffect, useState } from "react";
import { http, setAccessToken } from "../../shared/http";

type Role = "USER" | "ADMIN";
type Me = { id: string; nickname: string; role: Role };

type AuthCtx = {
  me: Me | null;
  loading: boolean;
  login: (nickname: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>(null as any);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshMe() {
    try {
      const r = await http.get("/auth/me");
      setMe(r.data);
    } catch {
      setMe(null);
    }
  }

  async function login(nickname: string, password: string) {
    const r = await http.post("/auth/login", { nickname, password });
    setAccessToken(r.data.accessToken);
    setMe(r.data.user);
  }

  async function logout() {
    await http.post("/auth/logout");
    setAccessToken(null);
    setMe(null);
  }

  useEffect(() => {
    (async () => {
      try {
        // tenta revalidar sessão via refresh (se cookie existir) e buscar /me
        const rr = await http.post("/auth/refresh");
        setAccessToken(rr.data.accessToken);
        await refreshMe();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <Ctx.Provider value={{ me, loading, login, logout, refreshMe }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
