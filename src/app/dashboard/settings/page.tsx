"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { CHANNELS, EXPENSE_CATEGORIES, PROPERTIES, TEAM, type Property } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { cn, fmtLKR } from "@/lib/utils";
import { Avatar, Badge, Button, Card, Field, PageHeader, Segmented, inputCls } from "@/components/ui";

type Tab = "apartments" | "platforms" | "team" | "categories" | "account";

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("apartments");

  return (
    <div className="max-w-4xl">
      <PageHeader title="Settings" subtitle="Apartments, booking platforms, team, categories and your account." />
      <div className="mb-10">
        <Segmented
          id="settings"
          value={tab}
          onChange={setTab}
          options={[
            { value: "apartments", label: "Apartments" },
            { value: "platforms", label: "Platforms" },
            { value: "team", label: "Team" },
            { value: "categories", label: "Categories" },
            { value: "account", label: "Account" },
          ]}
        />
      </div>

      {tab === "apartments" && <Apartments />}
      {tab === "platforms" && <Platforms />}
      {tab === "team" && <Team />}
      {tab === "categories" && <Categories />}
      {tab === "account" && <Account />}
    </div>
  );
}

/** Runs a Supabase write, shows its error, and reloads the store on success. */
function useSave() {
  const { reload } = useStore();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const run = async (fn: () => PromiseLike<{ error: { message: string } | null }>, after?: () => void) => {
    setBusy(true);
    setErr(null);
    const { error } = await fn();
    setBusy(false);
    if (error) return setErr(error.message);
    after?.();
    await reload();
  };
  return { busy, err, run };
}

function Apartments() {
  const [editing, setEditing] = useState<Property | "new" | null>(null);
  return (
    <div>
      <Card className="divide-y divide-neutral-100">
        {PROPERTIES.map((p) =>
          editing !== "new" && editing?.id === p.id ? (
            <ApartmentForm key={p.id} initial={p} onDone={() => setEditing(null)} />
          ) : (
            <Row key={p.id} title={p.name} sub={`${p.location || "No location yet"} · up to ${p.maxGuests} guests`}>
              <span className="text-sm font-semibold text-neutral-500 hidden sm:block">
                {p.baseRate ? fmtLKR(p.baseRate) : "No rate"}
                <span className="text-neutral-400 font-medium"> / night</span>
              </span>
              {p.status === "operating" ? <Badge tone="green" dot>Operating</Badge> : <Badge>{p.status === "setup" ? "Setting up" : "Inactive"}</Badge>}
              <IconEdit onClick={() => setEditing(p)} label={`Edit ${p.name}`} />
            </Row>
          )
        )}
        {editing === "new" && <ApartmentForm onDone={() => setEditing(null)} />}
      </Card>
      {editing === null && <AddButton onClick={() => setEditing("new")}>Add apartment</AddButton>}
    </div>
  );
}

function ApartmentForm({ initial, onDone }: { initial?: Property; onDone: () => void }) {
  const { busy, err, run } = useSave();
  const [f, setF] = useState({
    name: initial?.name ?? "",
    location: initial?.location ?? "",
    maxGuests: String(initial?.maxGuests ?? 2),
    baseRate: String(initial?.baseRate || ""),
    status: initial?.status ?? "setup",
  });
  const row = {
    name: f.name.trim(),
    location: f.location.trim(),
    max_guests: Number(f.maxGuests) || 1,
    base_rate_lkr: Number(f.baseRate) || 0,
    status: f.status,
  };
  const save = () =>
    run(
      () => (initial ? supabase.from("properties").update(row).eq("id", initial.id) : supabase.from("properties").insert(row)),
      onDone
    );
  return (
    <FormBox err={err} busy={busy} onCancel={onDone} onSave={save} canSave={!!row.name}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Name">
          <input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </Field>
        <Field label="Location">
          <input className={inputCls} placeholder="Town" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} />
        </Field>
        <Field label="Max guests">
          <input type="number" min={1} className={inputCls} value={f.maxGuests} onChange={(e) => setF({ ...f, maxGuests: e.target.value })} />
        </Field>
        <Field label="Usual nightly rate (LKR)">
          <input type="number" min={0} className={inputCls} value={f.baseRate} onChange={(e) => setF({ ...f, baseRate: e.target.value })} />
        </Field>
        <Field label="Status">
          <select className={inputCls} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as Property["status"] })}>
            <option value="operating">Operating (takes bookings)</option>
            <option value="setup">Setting up</option>
            <option value="inactive">Inactive</option>
          </select>
        </Field>
      </div>
    </FormBox>
  );
}

function Platforms() {
  const [adding, setAdding] = useState(false);
  const { busy, err, run } = useSave();
  const [f, setF] = useState({ name: "", commission: "", payoutDays: "" });
  return (
    <div>
      <Card className="divide-y divide-neutral-100">
        {CHANNELS.map((c) => (
          <Row
            key={c.id}
            title={c.name}
            sub={c.payoutDays ? `Pays out about ${c.payoutDays} day${c.payoutDays > 1 ? "s" : ""} after check-in` : "Paid directly by the guest"}
            dot={c.color}
          >
            <span className="text-sm font-semibold">
              {c.commission}%<span className="text-neutral-400 font-medium"> commission</span>
            </span>
          </Row>
        ))}
        {adding && (
          <FormBox
            err={err}
            busy={busy}
            canSave={!!f.name.trim()}
            onCancel={() => setAdding(false)}
            onSave={() =>
              run(
                () =>
                  supabase.from("channels").insert({
                    name: f.name.trim(),
                    default_commission_pct: Number(f.commission) || 0,
                    payout_delay_days: Number(f.payoutDays) || 0,
                    sort_order: CHANNELS.length + 1,
                  }),
                () => {
                  setAdding(false);
                  setF({ name: "", commission: "", payoutDays: "" });
                }
              )
            }
          >
            <div className="grid grid-cols-3 gap-3">
              <Field label="Name">
                <input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
              </Field>
              <Field label="Commission %">
                <input type="number" min={0} max={100} className={inputCls} value={f.commission} onChange={(e) => setF({ ...f, commission: e.target.value })} />
              </Field>
              <Field label="Payout after (days)">
                <input type="number" min={0} className={inputCls} value={f.payoutDays} onChange={(e) => setF({ ...f, payoutDays: e.target.value })} />
              </Field>
            </div>
          </FormBox>
        )}
      </Card>
      {!adding && <AddButton onClick={() => setAdding(true)}>Add platform</AddButton>}
    </div>
  );
}

function Team() {
  const [adding, setAdding] = useState(false);
  const { busy, err, run } = useSave();
  const [f, setF] = useState({ email: "", name: "", role: "staff" });
  const [invited, setInvited] = useState<string | null>(null);
  return (
    <div>
      <Card className="divide-y divide-neutral-100">
        {TEAM.map((m) => (
          <Row key={m.id} title={m.name} sub={[m.email, m.active ? m.scope : "Not invited, has no access"].filter(Boolean).join(" · ")} avatar={m.name}>
            <Badge tone={m.role === "Owner" ? "indigo" : "neutral"}>{m.role}</Badge>
          </Row>
        ))}
        {adding && (
          <FormBox
            err={err}
            busy={busy}
            canSave={/\S+@\S+\.\S+/.test(f.email)}
            saveLabel="Invite"
            onCancel={() => setAdding(false)}
            onSave={() =>
              run(
                () => supabase.rpc("invite_user", { p_email: f.email.trim(), p_role: f.role, p_name: f.name.trim() }),
                () => {
                  setInvited(f.email.trim());
                  setAdding(false);
                  setF({ email: "", name: "", role: "staff" });
                }
              )
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Email">
                <input type="email" className={inputCls} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
              </Field>
              <Field label="Name">
                <input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
              </Field>
              <Field label="Role">
                <select className={inputCls} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
                  <option value="staff">Staff</option>
                  <option value="owner">Owner</option>
                </select>
              </Field>
            </div>
          </FormBox>
        )}
      </Card>
      {invited && (
        <p className="mt-4 text-xs text-emerald-700 font-medium">
          {invited} is invited. Ask them to open this site and use &ldquo;Email me a sign-in link&rdquo;.
        </p>
      )}
      {!adding && <AddButton onClick={() => setAdding(true)}>Invite member</AddButton>}
    </div>
  );
}

function Categories() {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const { busy, err, run } = useSave();
  return (
    <div>
      <Card className="divide-y divide-neutral-100">
        {EXPENSE_CATEGORIES.map((c) => (
          <Row key={c} title={c} />
        ))}
        {adding && (
          <FormBox
            err={err}
            busy={busy}
            canSave={!!name.trim()}
            onCancel={() => setAdding(false)}
            onSave={() =>
              run(
                () => supabase.from("expense_categories").insert({ name: name.trim(), sort_order: EXPENSE_CATEGORIES.length + 1 }),
                () => {
                  setAdding(false);
                  setName("");
                }
              )
            }
          >
            <Field label="Category name">
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
          </FormBox>
        )}
      </Card>
      {!adding && <AddButton onClick={() => setAdding(true)}>Add category</AddButton>}
    </div>
  );
}

function Account() {
  const { user, setPassword } = useAuth();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const valid = pw.length >= 8 && pw === pw2;
  return (
    <Card className="p-6 space-y-4 max-w-md">
      <div>
        <p className="text-sm font-semibold">{user?.name}</p>
        <p className="text-xs text-neutral-400 font-medium">{user?.email}</p>
      </div>
      <Field label="New password (at least 8 characters)">
        <input type="password" autoComplete="new-password" className={inputCls} value={pw} onChange={(e) => setPw(e.target.value)} />
      </Field>
      <Field label="Repeat password">
        <input type="password" autoComplete="new-password" className={inputCls} value={pw2} onChange={(e) => setPw2(e.target.value)} />
      </Field>
      {pw2 && pw !== pw2 && <p className="text-xs text-red-600 font-medium">Passwords don&apos;t match.</p>}
      {msg && <p className={cn("text-xs font-medium", msg.ok ? "text-emerald-700" : "text-red-600")}>{msg.text}</p>}
      <Button
        disabled={!valid || busy}
        onClick={async () => {
          setBusy(true);
          const e = await setPassword(pw);
          setBusy(false);
          setMsg(e ? { ok: false, text: e } : { ok: true, text: "Password saved. You can now sign in with it." });
          if (!e) {
            setPw("");
            setPw2("");
          }
        }}
      >
        Save password
      </Button>
    </Card>
  );
}

function FormBox({
  children,
  err,
  busy,
  canSave,
  onCancel,
  onSave,
  saveLabel = "Save",
}: {
  children: React.ReactNode;
  err: string | null;
  busy: boolean;
  canSave: boolean;
  onCancel: () => void;
  onSave: () => void;
  saveLabel?: string;
}) {
  return (
    <div className="px-6 py-5 bg-soft space-y-4">
      {children}
      {err && <p className="text-xs text-red-600 font-medium">{err}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSave} disabled={!canSave || busy}>
          {busy ? "Saving…" : saveLabel}
        </Button>
      </div>
    </div>
  );
}

function AddButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <Button variant="secondary" className="mt-4" onClick={onClick}>
      <Plus className="w-4 h-4" /> {children}
    </Button>
  );
}

function IconEdit({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} aria-label={label} className="p-2 rounded-lg text-neutral-400 hover:text-ink hover:bg-soft">
      <Pencil className="w-4 h-4" />
    </button>
  );
}

function Row({ title, sub, children, dot, avatar }: { title: string; sub?: string; children?: React.ReactNode; dot?: string; avatar?: string }) {
  return (
    <div className="flex items-center gap-4 px-6 py-5">
      {avatar && <Avatar name={avatar} />}
      {dot && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: dot }} />}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{title}</p>
        {sub && <p className="text-xs text-neutral-400 font-medium truncate mt-0.5">{sub}</p>}
      </div>
      <div className="flex items-center gap-4 shrink-0">{children}</div>
    </div>
  );
}
