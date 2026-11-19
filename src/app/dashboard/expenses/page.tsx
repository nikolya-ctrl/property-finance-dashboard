"use client";

import { useMemo, useState } from "react";
import { endOfMonth, format, parseISO, startOfMonth, subMonths } from "date-fns";
import { Camera, CheckCircle2, Plus, Receipt } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { EXPENSE_CATEGORIES, PROPERTIES, iso, propertyById } from "@/lib/mock-data";
import { cn, fmtLKR, fmtUSD } from "@/lib/utils";
import { Button, Card, Drawer, Empty, Field, PageHeader, SectionTitle, inputCls } from "@/components/ui";

export default function ExpensesPage() {
  const { user } = useAuth();
  const { expenses, addExpense } = useStore();
  const isOwner = user!.role === "owner";
  const [monthOffset, setMonthOffset] = useState(0);
  const [prop, setProp] = useState("all");
  const [adding, setAdding] = useState(false);

  const month = subMonths(new Date(), monthOffset);
  const from = iso(startOfMonth(month));
  const to = iso(endOfMonth(month));

  // staff only see what they entered
  const visible = expenses.filter((e) => isOwner || e.by === user!.name);
  const rows = visible.filter(
    (e) => e.date >= from && e.date <= to && (prop === "all" || (prop === "shared" ? e.propertyId === null : e.propertyId === prop))
  );
  const total = rows.reduce((s, e) => s + e.amount, 0);

  const byCat = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((e) => m.set(e.category, (m.get(e.category) ?? 0) + e.amount));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  return (
    <div>
      <PageHeader
        title="Expenses"
        subtitle={isOwner ? "Running costs for every apartment." : "Expenses you've added."}
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus className="w-4 h-4" /> Add expense
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-2 mb-10">
        <select value={monthOffset} onChange={(e) => setMonthOffset(Number(e.target.value))} className={cn(inputCls, "sm:w-48")}>
          {[0, 1, 2, 3].map((i) => (
            <option key={i} value={i}>{format(subMonths(new Date(), i), "MMMM yyyy")}</option>
          ))}
        </select>
        <select value={prop} onChange={(e) => setProp(e.target.value)} className={cn(inputCls, "sm:w-52")}>
          <option value="all">All apartments</option>
          {PROPERTIES.filter((p) => p.status === "operating").map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
          <option value="shared">Shared costs</option>
        </select>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-12">
        <section className="min-w-0">
          <SectionTitle>{format(month, "MMMM")} · {rows.length} entries</SectionTitle>
          {rows.length === 0 ? (
            <Empty icon={Receipt} title="No expenses" text="Nothing recorded for this month yet." />
          ) : (
            <Card className="divide-y divide-neutral-100">
              {rows.map((e) => (
                <div key={e.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="w-10 h-10 rounded-full bg-soft border border-neutral-100 flex items-center justify-center shrink-0">
                    <Receipt className="w-4 h-4 text-neutral-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{e.note}</p>
                    <p className="text-xs text-neutral-400 font-medium truncate">
                      {e.category} · {e.propertyId ? propertyById(e.propertyId).name : "Shared"} · {format(parseISO(e.date), "d MMM")}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold tracking-tight">{fmtLKR(e.amount)}</p>
                    <p className="text-[11px] text-neutral-400 font-medium">{fmtUSD(e.amount)}</p>
                  </div>
                </div>
              ))}
            </Card>
          )}
        </section>

        <aside>
          <div className="bg-soft border border-neutral-100 rounded-2xl p-6 mb-10">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-4">Total</p>
            <p className="text-3xl font-bold tracking-tight">{fmtLKR(total)}</p>
            <p className="text-sm text-neutral-400 font-medium mt-1">{fmtUSD(total)}</p>
          </div>
          <SectionTitle>By category</SectionTitle>
          <div className="space-y-4">
            {byCat.map(([cat, amt]) => (
              <div key={cat}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium text-neutral-600">{cat}</span>
                  <span className="font-semibold">{Math.round((amt / total) * 100)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                  <div className="h-full rounded-full bg-neutral-900" style={{ width: `${(amt / total) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <AddExpense
        open={adding}
        onClose={() => setAdding(false)}
        onSave={(e) => addExpense({ ...e, id: `x${Date.now()}`, by: user!.name })}
      />
    </div>
  );
}

function AddExpense({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (e: { date: string; propertyId: string | null; category: string; note: string; amount: number }) => void;
}) {
  const [f, setF] = useState({ date: iso(new Date()), propertyId: "kandy", category: EXPENSE_CATEGORIES[5], note: "", amount: "" });
  const [done, setDone] = useState(false);
  const valid = f.note.trim() && Number(f.amount) > 0;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Add expense"
      subtitle="Record a cost for an apartment or a shared cost."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!valid || done}
            onClick={() => {
              onSave({ date: f.date, propertyId: f.propertyId === "shared" ? null : f.propertyId, category: f.category, note: f.note.trim(), amount: Number(f.amount) });
              setDone(true);
              setTimeout(() => {
                setDone(false);
                setF((x) => ({ ...x, note: "", amount: "" }));
                onClose();
              }, 800);
            }}
          >
            {done ? <><CheckCircle2 className="w-4 h-4" /> Saved</> : "Save expense"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Amount (LKR)">
          <input type="number" min={0} className={cn(inputCls, "text-lg font-bold py-3")} placeholder="0" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
        </Field>
        <Field label="What was it for?">
          <input className={inputCls} placeholder="e.g. Laundry service" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <select className={inputCls} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
              {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Date">
            <input type="date" className={inputCls} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
          </Field>
        </div>
        <Field label="Apartment">
          <select className={inputCls} value={f.propertyId} onChange={(e) => setF({ ...f, propertyId: e.target.value })}>
            {PROPERTIES.filter((p) => p.status === "operating").map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            <option value="shared">Shared (all apartments)</option>
          </select>
        </Field>
        <button type="button" className="w-full mt-2 border border-dashed border-neutral-200 rounded-2xl py-8 flex flex-col items-center gap-2 text-neutral-400 hover:border-neutral-300 hover:text-neutral-600 transition-colors">
          <Camera className="w-5 h-5" />
          <span className="text-xs font-semibold">Add receipt photo</span>
        </button>
      </div>
    </Drawer>
  );
}
