"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Role = "owner" | "staff";
export type User = { name: string; email: string; role: Role; title: string };

/**
 * DEMO ONLY: UI prototype with no backend.
 * These test accounts are hard-coded and must be replaced by Supabase Auth.
 */
const DEMO_USERS: (User & { password: string })[] = [
  { name: "Ayesha Fernando", email: "owner@haven.test", password: "owner123", role: "owner", title: "Owner" },
  { name: "Nimal Perera", email: "staff@haven.test", password: "staff123", role: "staff", title: "Caretaker · Kandy" },
];

export const DEMO_LOGINS = DEMO_USERS.map(({ email, password, role }) => ({ email, password, role }));

const KEY = "haven.demo.session";

type AuthCtx = {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => string | null;
  logout: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, []);

  const login = useCallback((email: string, password: string) => {
    const match = DEMO_USERS.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
    );
    if (!match) return "That email and password don't match a demo account.";
    const { password: _pw, ...u } = match;
    setUser(u);
    try {
      localStorage.setItem(KEY, JSON.stringify(u));
    } catch {}
    return null;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    try {
      localStorage.removeItem(KEY);
    } catch {}
  }, []);

  return <Ctx.Provider value={{ user, ready, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
