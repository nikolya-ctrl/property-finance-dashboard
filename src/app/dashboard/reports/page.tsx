"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { startOfMonth, subMonths, addDays, endOfMonth } from "date-fns";
import { Download } from "lucide-react";
import { useStore } from "@/lib/store";
import { CHANNELS, PROPERTIES, bookingMoney } from "@/lib/mock-data";
import { lastMonths, monthStats, nightsIn } from "@/lib/metrics";
import { cn, fmtLKR, fmtLKRShort, fmtUSD } from "@/lib/utils";
import { Button, Card, PageHeader, SectionTitle, Segmented, Stat } from "@/components/ui";

type Tab = "pnl" | "platforms" | "occupancy";

export default function ReportsPage() {
  const { bookings, expenses } = useStore();
  const [tab, setTab] = useState<Tab>("pnl");
  const [prop, setProp] = useState<string>("all");
  const pid = prop === "all" ? undefined : prop;

  const months = useMemo(() => lastMonths(4).map((m) => monthStats(bookings, expenses, m, pid)), [bookings, expenses, pid]);
  const total = months.reduce(
    (a, m) => ({ net: a.net + m.net, expenses: a.expenses + m.expenses, profit: a.profit + m.profit, nights: a.nights + m.nights }),
    { net: 0, expenses: 0, profit: 0, nights: 0 }
  );

  const platforms = useMemo(() => {
    const from = startOfMonth(subMonths(new Date(), 3));
    const to = addDays(endOfMonth(new Date()), 1);
    return CHANNELS.map((c) => {
      const bs = bookings.filter((b) => b.channel === c.id && (!pid || b.propertyId === pid) && nightsIn(b, from, to) > 0);
      const ok = bs.filter((b) => b.status !== "cancelled" && b.status !== "enquiry");
      const nights = ok.reduce((s, b) => s + nightsIn(b, from, to), 0);
      const gross = ok.reduce((s, b) => s + bookingMoney(b).grossLKR, 0);
      const commission = ok.reduce((s, b) => s + bookingMoney(b).commission, 0);
      return {
        ...c,
        bookings: ok.length,
        nights,
        gross,
        commission,
        net: gross - commission,
        adr: nights ? gross / nights : 0,
        cancelled: bs.length ? (bs.length - ok.length) / bs.length : 0,
      };
    }).filter((p) => p.bookings > 0).sort((a, b) => b.net - a.net);
  }, [bookings, pid]);
  const maxNet = Math.max(...platforms.map((p) => p.net), 1);

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Last 4 months · revenue counted on the nights stayed."
        actions={
          <Button variant="secondary">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        }
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <Segmented
          id="reports"
          value={tab}
          onChange={setTab}
          options={[
            { value: "pnl", label: "Profit & loss" },
            { value: "platforms", label: "Platforms" },
            { value: "occupancy", label: "Occupancy" },
          ]}
        />
        <Segmented
          id="reports-prop"
          value={prop}
          onChange={setProp}
          options={[{ value: "all", label: "All" }, ...PROPERTIES.filter((p) => p.status === "operating").map((p) => ({ value: p.id, label: p.location }))]}
        />
      </div>

      {tab === "pnl" && (
        <div className="space-y-14">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Stat label="Income" value={fmtLKRShort(total.net)} sub={fmtUSD(total.net)} />
            <Stat label="Expenses" value={fmtLKRShort(total.expenses)} sub={fmtUSD(total.expenses)} />
            <Stat label="Profit" value={fmtLKRShort(total.profit)} sub={`${fmtUSD(total.profit)} · ${total.net ? Math.round((total.profit / total.net) * 100) : 0}% margin`} />
          </div>

          <section>
            <SectionTitle>Income vs expenses</SectionTitle>
            <div className="h-72 -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={months.map((m) => ({ name: m.label, Income: Math.round(m.net), Expenses: Math.round(m.expenses) }))} barGap={6} barCategoryGap="30%">
                  <CartesianGrid vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#a3a3a3", fontSize: 12, fontWeight: 600 }} />
                  <YAxis axisLine={false} tickLine={false} width={56} tick={{ fill: "#a3a3a3", fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <Tooltip
                    cursor={{ fill: "#fafafa" }}
                    contentStyle={{ borderRadius: 12, border: "1px solid #f0f0f0", boxShadow: "0 8px 30px rgba(0,0,0,0.06)", fontSize: 12, fontWeight: 600 }}
                    formatter={(v) => fmtLKR(Number(v))}
                  />
                  <Bar dataKey="Income" fill="#0f0f14" radius={[6, 6, 0, 0]} maxBarSize={36} />
                  <Bar dataKey="Expenses" fill="#d4d4d8" radius={[6, 6, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-6 mt-2 text-xs font-medium text-neutral-500">
              <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm bg-ink" />Income (net of commission)</span>
              <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm bg-zinc-300" />Expenses</span>
            </div>
          </section>

          <section>
            <SectionTitle>Monthly breakdown</SectionTitle>
            <Card className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-neutral-400">
                    {["Month", "Room revenue", "Commission", "Extras", "Expenses", "Profit"].map((h, i) => (
                      <th key={h} className={cn("font-bold px-6 py-4", i > 0 && "text-right")}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {[...months].reverse().map((m) => (
                    <tr key={m.month}>
                      <td className="px-6 py-4 font-semibold">{m.month}</td>
                      <td className="px-6 py-4 text-right font-medium">{fmtLKR(m.gross)}</td>
                      <td className="px-6 py-4 text-right font-medium text-neutral-400">− {fmtLKR(m.commission)}</td>
                      <td className="px-6 py-4 text-right font-medium text-neutral-500">+ {fmtLKR(m.extras)}</td>
                      <td className="px-6 py-4 text-right font-medium text-neutral-400">− {fmtLKR(m.expenses)}</td>
                      <td className={cn("px-6 py-4 text-right font-bold", m.profit < 0 && "text-red-600")}>{fmtLKR(m.profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </section>
        </div>
      )}

      {tab === "platforms" && (
        <div className="space-y-4">
          {platforms.map((p) => (
            <div key={p.id} className="bg-white border border-neutral-100 rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="md:w-48 shrink-0">
                  <p className="font-bold tracking-tight flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                    {p.name}
                  </p>
                  <p className="text-xs text-neutral-400 font-medium mt-1">{p.commission}% commission</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-6 flex-1">
                  <Mini label="Bookings" value={String(p.bookings)} />
                  <Mini label="Nights" value={String(p.nights)} />
                  <Mini label="Avg / night" value={fmtLKRShort(p.adr)} />
                  <Mini label="Commission" value={fmtLKRShort(p.commission)} />
                  <Mini label="You earned" value={fmtLKRShort(p.net)} strong />
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-neutral-100 mt-6 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${(p.net / maxNet) * 100}%`, background: p.color }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "occupancy" && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-neutral-400">
                {["Month", "Occupancy", "Nights booked", "Avg daily rate", "Revenue / available night"].map((h, i) => (
                  <th key={h} className={cn("font-bold px-6 py-4", i > 1 && "text-right")}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {[...months].reverse().map((m) => (
                <tr key={m.month}>
                  <td className="px-6 py-5 font-semibold">{m.month}</td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                        <div className="h-full bg-accent rounded-full" style={{ width: `${Math.min(100, m.occupancy * 100)}%` }} />
                      </div>
                      <span className="font-bold">{Math.round(m.occupancy * 100)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right font-medium">{m.nights}</td>
                  <td className="px-6 py-5 text-right font-medium">{fmtLKR(m.adr)}</td>
                  <td className="px-6 py-5 text-right font-medium">{fmtLKR(m.revpar)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function Mini({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider mb-1">{label}</p>
      <p className={cn("text-sm font-semibold", strong && "font-bold")}>{value}</p>
    </div>
  );
}
