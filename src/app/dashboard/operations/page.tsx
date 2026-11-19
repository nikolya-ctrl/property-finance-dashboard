"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Check, Minus, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { propertyById } from "@/lib/mock-data";
import { cn, fmtLKR } from "@/lib/utils";
import { Badge, Card, PageHeader, Segmented } from "@/components/ui";

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
          {["kandy", "mirissa"].map((pid) => (
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
              </Card>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
