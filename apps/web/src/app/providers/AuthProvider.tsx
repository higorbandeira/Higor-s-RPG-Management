import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { http, setAccessToken } from "@/shared/api/http";

type Me = {
  id: string;
  nickname: string;
  role: "USER" | "ADMIN";
};

type AuthCtx = {
  me: Me | null;
  loading: boolean;
  login: (nickname: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshMe() {
    const res = await http.get("/auth/me");
    setMe(res.data as Me);
  }

  async function restoreSession() {
    try {
      // Try refresh first (cookie-based). If ok, token gets set via interceptor on next call
      const r = await http.post("/auth/refresh");
      setAccessToken(r.data.accessToken);
      await refreshMe();
    } catch {
      setAccessToken(null);
      setMe(null);
    }
  }

  useEffect(() => {
    restoreSession().finally(() => setLoading(false));
  }, []);

  async function login(nickname: string, password: string) {
    const res = await http.post("/auth/login", { nickname, password });
    setAccessToken(res.data.accessToken);
    setMe(res.data.user);
  }

  async function logout() {
    try {
      await http.post("/auth/logout", {});
    } finally {
      setAccessToken(null);
      setMe(null);
    }
  }

  const value = useMemo<AuthCtx>(
    () => ({ me, loading, login, logout, refreshMe }),
    [me, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
