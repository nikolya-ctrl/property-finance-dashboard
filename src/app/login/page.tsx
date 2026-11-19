"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { DEMO_LOGINS, useAuth } from "@/lib/auth";
import { inputCls } from "@/components/ui";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const { user, ready, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace("/dashboard");
  }, [ready, user, router]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const err = login(email, password);
    if (err) {
      setError(err);
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-b from-neutral-50 to-white p-6 text-ink">
      <div className="w-full max-w-[420px]">
        <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-neutral-100/80">
          <div className="text-center mb-10">
            <div className="text-xl font-bold tracking-[0.3em] text-ink mb-8">HAVEN</div>
            <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-neutral-500 text-sm mt-1.5 font-medium">Sign in to manage your stays</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="text-xs font-semibold text-neutral-700 block mb-1.5">Email</span>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  placeholder="you@example.com"
                  className={cn(inputCls, "pl-10")}
                />
              </div>
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-neutral-700 block mb-1.5">Password</span>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder="••••••••"
                  className={cn(inputCls, "pl-10 pr-10")}
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition-colors"
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </label>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">{error}</div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 px-4 bg-neutral-900 hover:bg-black text-white text-sm font-semibold rounded-2xl shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] !mt-6"
            >
              Sign in
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="relative my-8 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-100" />
            </div>
            <span className="relative bg-white px-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Demo accounts
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {DEMO_LOGINS.map((d) => (
              <button
                key={d.email}
                type="button"
                onClick={() => {
                  setEmail(d.email);
                  setPassword(d.password);
                  setError(null);
                }}
                className="text-left p-3 rounded-2xl border border-neutral-100 bg-soft hover:border-neutral-200 hover:bg-white transition-colors"
              >
                <span className="block text-sm font-semibold capitalize">{d.role}</span>
                <span className="block text-[11px] text-neutral-400 font-medium truncate">{d.email}</span>
              </button>
            ))}
          </div>
        </div>
        <p className="text-center text-[11px] text-neutral-400 font-medium mt-6">UI prototype · demo data only</p>
      </div>
    </div>
  );
}
