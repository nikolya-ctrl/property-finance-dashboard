"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type Role = "owner" | "staff";
export type User = { id: string; name: string; email: string; role: Role; title: string; active: boolean };

type AuthCtx = {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  sendLink: (email: string) => Promise<string | null>;
  setPassword: (password: string) => Promise<string | null>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

async function loadUser(session: Session | null): Promise<User | null> {
  if (!session) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, role, title, active")
    .eq("id", session.user.id)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    name: data.full_name || session.user.email || "",
    email: session.user.email ?? "",
    role: data.role as Role,
    title: data.title || (data.role === "owner" ? "Owner" : "Staff"),
    active: data.active,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(async ({ data }) => {
      const u = await loadUser(data.session);
      if (alive) {
        setUser(u);
        setReady(true);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // Defer the profile query so it doesn't run inside the auth callback lock.
      setTimeout(async () => {
        const u = await loadUser(session);
        if (alive) {
          setUser(u);
          setReady(true);
        }
      }, 0);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return error.message === "Invalid login credentials" ? "That email and password don't match." : error.message;
    return null;
  }, []);

  const sendLink = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    return error ? error.message : null;
  }, []);

  const setPassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return error ? error.message : null;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  return <Ctx.Provider value={{ user, ready, login, sendLink, setPassword, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
