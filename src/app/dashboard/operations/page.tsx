"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Check, Minus, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { PROPERTIES, propertyById } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import { cn, fmtLKR } from "@/lib/utils";
import { Badge, Button, Card, Field, PageHeader, Segmented, inputCls } from "@/components/ui";

type Tab = "cleaning" | "maintenance" | "inventory";

export default function OperationsPage() {
  const { user } = useAuth();
  const { cleaning, toggleCleaning, issues, setIssueStatus, inventory, adjustStock } = useStore();
  const isOwner = user!.role === "owner";
  const [tab, setTab] = useState<Tab>("cleaning");
  const open = issues.filter((i) => i.status !== "fixed").length;
  const low = inventory.filter((i) => i.qty <= i.low).length;

  return (
    <div>
      <PageHeader title="Operations" subtitle="Cleaning, repairs and supplies across the apartments." />

      <div className="mb-10">
        <Segmented
          id="ops"
          value={tab}
          onChange={setTab}
          options={[
            { value: "cleaning", label: "Cleaning", count: cleaning.filter((c) => !c.done).length },
            { value: "maintenance", label: "Maintenance", count: open },
            { value: "inventory", label: "Inventory", count: low },
          ]}
        />
      </div>

      {tab === "cleaning" && (
        <div className="space-y-3 max-w-3xl">
          {cleaning.length === 0 && <p className="text-sm text-neutral-400">No cleaning tasks.</p>}
          {cleaning.map((c) => (
            <button
              key={c.id}
              onClick={() => toggleCleaning(c.id)}
              className="w-full flex items-center gap-4 bg-white border border-neutral-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-neutral-200 transition-all text-left"
            >
              <span className={cn("w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-colors", c.done ? "bg-neutral-900 border-neutral-900" : "border-neutral-300")}>
                {c.done && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
              </span>
              <div className="flex-1 min-w-0">
                <p className={cn("font-semibold tracking-tight", c.done && "line-through text-neutral-400")}>{propertyById(c.propertyId).name}</p>
                <p className="text-sm text-neutral-400 font-medium">{c.note}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold">{format(parseISO(c.date), "EEE d MMM")}</p>
                <p className="text-xs text-neutral-400 font-medium">{c.assignee}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {tab === "maintenance" && (
        <div className="space-y-3 max-w-3xl">
          <ReportIssue />
          {issues.length === 0 && <p className="text-sm text-neutral-400 font-medium">No issues reported.</p>}
          {issues.map((i) => (
            <div key={i.id} className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white border border-neutral-100 rounded-2xl p-5 shadow-sm">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className={cn("font-semibold tracking-tight", i.status === "fixed" && "text-neutral-400")}>{i.title}</p>
                  {i.priority === "urgent" && i.status !== "fixed" && <Badge tone="red">Urgent</Badge>}
                </div>
                <p className="text-sm text-neutral-400 font-medium">
                  {propertyById(i.propertyId).name} · reported {format(parseISO(i.reported), "d MMM")}
                  {isOwner && i.cost !== undefined && ` · ${fmtLKR(i.cost)}`}
                </p>
              </div>
              <select
                value={i.status}
                onChange={(e) => setIssueStatus(i.id, e.target.value as typeof i.status)}
                className={cn(
                  "text-xs font-semibold rounded-lg px-3 py-2 border-0 focus:outline-none focus:ring-2 focus:ring-neutral-900 cursor-pointer w-fit",
                  i.status === "open" && "bg-red-50 text-red-600",
                  i.status === "in_progress" && "bg-amber-50 text-amber-700",
                  i.status === "fixed" && "bg-emerald-50 text-emerald-700"
                )}
              >
                <option value="open">Open</option>
                <option value="in_progress">In progress</option>
                <option value="fixed">Fixed</option>
              </select>
            </div>
          ))}
        </div>
      )}

      {tab === "inventory" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {PROPERTIES.filter((p) => p.status === "operating").map((p) => p.id).map((pid) => (
            <section key={pid}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-4">{propertyById(pid).name}</p>
              <Card className="divide-y divide-neutral-100">
                {inventory.filter((v) => v.propertyId === pid).map((v) => {
                  const isLow = v.qty <= v.low;
                  return (
                    <div key={v.id} className="flex items-center gap-4 px-5 py-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{v.name}</p>
                        <p className={cn("text-xs font-medium", isLow ? "text-amber-600" : "text-neutral-400")}>
                          {isLow ? `Low · restock at ${v.low}` : `Restock at ${v.low}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 bg-soft border border-neutral-100 rounded-xl p-1">
                        <button onClick={() => adjustStock(v.id, -1)} className="p-1.5 rounded-lg hover:bg-white text-neutral-500" aria-label={`Use one ${v.name}`}>
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-14 text-center text-sm font-bold">
                          {v.qty} <span className="text-[10px] text-neutral-400 font-medium">{v.unit}</span>
                        </span>
                        <button onClick={() => adjustStock(v.id, 1)} className="p-1.5 rounded-lg hover:bg-white text-neutral-500" aria-label={`Add one ${v.name}`}>
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                <AddStockItem propertyId={pid} />
              </Card>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function ReportIssue() {
  const { reload } = useStore();
  const operating = PROPERTIES.filter((p) => p.status === "operating");
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: "", propertyId: operating[0]?.id ?? "", priority: "medium" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!open)
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4" /> Report an issue
      </Button>
    );
  return (
    <Card className="p-5 space-y-3">
      <Field label="What's wrong?">
        <input className={inputCls} placeholder="e.g. Hot water not working" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Apartment">
          <select className={inputCls} value={f.propertyId} onChange={(e) => setF({ ...f, propertyId: e.target.value })}>
            {operating.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Priority">
          <select className={inputCls} value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="urgent">Urgent</option>
          </select>
        </Field>
      </div>
      {err && <p className="text-xs text-red-600 font-medium">{err}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
        <Button
          disabled={!f.title.trim() || !f.propertyId || busy}
          onClick={async () => {
            setBusy(true);
            const { error } = await supabase.from("maintenance_issues").insert({ title: f.title.trim(), property_id: f.propertyId, priority: f.priority });
            setBusy(false);
            if (error) return setErr(error.message);
            setF({ ...f, title: "" });
            setOpen(false);
            await reload();
          }}
        >
          Save issue
        </Button>
      </div>
    </Card>
  );
}

function AddStockItem({ propertyId }: { propertyId: string }) {
  const { reload } = useStore();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", unit: "pcs", qty: "", low: "" });
  const [err, setErr] = useState<string | null>(null);
  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="w-full flex items-center gap-2 px-5 py-4 text-sm font-semibold text-neutral-500 hover:text-ink">
        <Plus className="w-4 h-4" /> Add item
      </button>
    );
  return (
    <div className="px-5 py-4 space-y-3 bg-soft">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <input className={inputCls} placeholder="Item" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input className={inputCls} placeholder="Unit" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} />
        <input type="number" min={0} className={inputCls} placeholder="In stock" value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} />
        <input type="number" min={0} className={inputCls} placeholder="Restock at" value={f.low} onChange={(e) => setF({ ...f, low: e.target.value })} />
      </div>
      {err && <p className="text-xs text-red-600 font-medium">{err}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
        <Button
          disabled={!f.name.trim()}
          onClick={async () => {
            const { error } = await supabase.from("inventory_items").insert({
              property_id: propertyId,
              name: f.name.trim(),
              unit: f.unit.trim() || "pcs",
              quantity: Number(f.qty) || 0,
              low_stock_level: Number(f.low) || 0,
            });
            if (error) return setErr(error.message);
            setF({ name: "", unit: "pcs", qty: "", low: "" });
            setOpen(false);
            await reload();
          }}
        >
          Add
        </Button>
      </div>
    </div>
  );
}
