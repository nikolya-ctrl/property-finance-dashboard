"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { addDays, format, parseISO } from "date-fns";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Car,
  Check,
  ChevronRight,
  Clock,
  Package,
  Percent,
  Plus,
  TrendingUp,
  Wallet,
  Wrench,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { bookingMoney, iso, PROPERTIES, propertyById, today, type Booking } from "@/lib/data";
import { monthStats } from "@/lib/metrics";
import { cn, fmtLKR, fmtLKRShort, fmtUSD } from "@/lib/utils";
import { Avatar, Badge, Button, Card, ChannelTag, SectionTitle, Stat } from "@/components/ui";
import { BookingDetail } from "@/components/booking-detail";

const active = (b: Booking) => b.status !== "cancelled" && b.status !== "enquiry";

export default function TodayPage() {
  const { user } = useAuth();
  const { bookings, expenses, cleaning, toggleCleaning, issues, inventory, setNewBookingOpen } = useStore();
  const [open, setOpen] = useState<Booking | null>(null);
  const isOwner = user!.role === "owner";
  const t = iso(today());

  const arrivals = bookings.filter((b) => active(b) && b.checkIn === t);
  const departures = bookings.filter((b) => active(b) && b.checkOut === t);
  const upcoming = bookings.filter(
    (b) => active(b) && b.checkIn > t && b.checkIn <= iso(addDays(today(), 7))
  );

  const stats = useMemo(() => monthStats(bookings, expenses, new Date()), [bookings, expenses]);

  const attention = useMemo(() => {
    const items: { icon: React.ElementType; tone: string; title: string; sub: string; booking?: Booking; owner?: boolean }[] = [];
    for (const b of bookings) {
      if (!active(b) || b.status === "completed") continue;
      const m = bookingMoney(b);
      if (m.balance > 0 && b.checkIn <= iso(addDays(today(), 3)))
        items.push({ icon: Wallet, tone: "text-amber-600 bg-amber-50", title: `Collect ${fmtLKR(m.balance)}`, sub: `${b.guest.name} · ${propertyById(b.propertyId).name}`, booking: b });
    }
    for (const b of bookings)
      if (b.payout === "late")
        items.push({ icon: AlertCircle, tone: "text-red-600 bg-red-50", title: "Payout overdue", sub: `${b.ref} · ${b.guest.name}`, booking: b, owner: true });
    for (const i of issues.filter((x) => x.status !== "fixed"))
      items.push({ icon: Wrench, tone: i.priority === "urgent" ? "text-red-600 bg-red-50" : "text-neutral-500 bg-neutral-100", title: i.title, sub: propertyById(i.propertyId).name });
    for (const v of inventory.filter((x) => x.qty <= x.low))
      items.push({ icon: Package, tone: "text-neutral-500 bg-neutral-100", title: `Low stock: ${v.name}`, sub: `${v.qty} ${v.unit} left · ${propertyById(v.propertyId).name}` });
    return items.filter((i) => isOwner || !i.owner);
  }, [bookings, issues, inventory, isOwner]);

  const todayClean = cleaning.filter((c) => c.date === t);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
        <div>
          <p className="text-sm font-medium text-neutral-400 mb-2">{format(new Date(), "EEEE, d MMMM")}</p>
          <h1 className="text-3xl font-bold tracking-tight">
            {greeting}, {user!.name.split(" ")[0]}
          </h1>
          <p className="text-neutral-500 mt-2 text-sm font-medium">
            {arrivals.length} arrival{arrivals.length !== 1 && "s"} and {departures.length} departure
            {departures.length !== 1 && "s"} today.
          </p>
        </div>
        <Button onClick={() => setNewBookingOpen(true)} className="hidden md:inline-flex">
          <Plus className="w-4 h-4" /> New booking
        </Button>
      </div>

      {isOwner && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-14">
          <Stat label="Income" icon={TrendingUp} value={fmtLKRShort(stats.net)} sub={`${fmtUSD(stats.net)} · ${stats.month}`} />
          <Stat label="Expenses" icon={ArrowDownRight} value={fmtLKRShort(stats.expenses)} sub={fmtUSD(stats.expenses)} />
          <Stat
            label="Profit"
            icon={ArrowUpRight}
            value={fmtLKRShort(stats.profit)}
            sub={fmtUSD(stats.profit)}
          />
          <Stat label="Occupancy" icon={Percent} value={`${Math.round(stats.occupancy * 100)}%`} sub={`${stats.nights} nights booked`} />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-12">
        <div className="space-y-12 min-w-0">
          <section>
            <SectionTitle>Today</SectionTitle>
            {arrivals.length + departures.length === 0 ? (
              <p className="text-sm text-neutral-400 font-medium">No check-ins or check-outs today.</p>
            ) : (
              <div className="space-y-3">
                {arrivals.map((b) => (
                  <MoveRow key={b.id} b={b} kind="in" isOwner={isOwner} onClick={() => setOpen(b)} />
                ))}
                {departures.map((b) => (
                  <MoveRow key={b.id} b={b} kind="out" isOwner={isOwner} onClick={() => setOpen(b)} />
                ))}
              </div>
            )}
          </section>

          <section>
            <SectionTitle
              action={
                <Link href="/dashboard/bookings" className="text-xs font-semibold text-accent hover:text-indigo-700 flex items-center gap-0.5">
                  All bookings <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              }
            >
              Next 7 days
            </SectionTitle>
            <Card className="divide-y divide-neutral-100">
              {upcoming.length === 0 && <p className="p-6 text-sm text-neutral-400">Nothing booked this week yet.</p>}
              {upcoming.map((b) => (
                <button key={b.id} onClick={() => setOpen(b)} className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-neutral-50/70 transition-colors first:rounded-t-2xl last:rounded-b-2xl">
                  <div className="w-12 text-center shrink-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{format(parseISO(b.checkIn), "EEE")}</p>
                    <p className="text-lg font-bold tracking-tight leading-tight">{format(parseISO(b.checkIn), "d")}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{b.guest.name}</p>
                    <p className="text-xs text-neutral-400 font-medium truncate">
                      {propertyById(b.propertyId).name} · {format(parseISO(b.checkIn), "d MMM")} – {format(parseISO(b.checkOut), "d MMM")}
                    </p>
                  </div>
                  <ChannelTag id={b.channel} className="hidden sm:inline-flex" />
                  <ChevronRight className="w-4 h-4 text-neutral-300" />
                </button>
              ))}
            </Card>
          </section>

          <section>
            <SectionTitle>Apartments</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {PROPERTIES.map((p) => {
                const staying = bookings.find((b) => b.propertyId === p.id && active(b) && b.checkIn <= t && b.checkOut > t);
                const next = bookings.find((b) => b.propertyId === p.id && active(b) && b.checkIn > t);
                return (
                  <div key={p.id} className={cn("rounded-2xl border p-5", p.status === "operating" ? "border-neutral-100 bg-white" : "border-dashed border-neutral-200 bg-soft")}>
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div>
                        <p className="font-semibold tracking-tight">{p.name}</p>
                        <p className="text-xs text-neutral-400 font-medium">{p.location}</p>
                      </div>
                      {p.status !== "operating" ? (
                        <Badge>Opening soon</Badge>
                      ) : staying ? (
                        <Badge tone="green" dot>Occupied</Badge>
                      ) : (
                        <Badge tone="indigo" dot>Vacant</Badge>
                      )}
                    </div>
                    {p.status === "operating" && (
                      <p className="text-xs text-neutral-500 font-medium">
                        {staying
                          ? `${staying.guest.name.split(" ")[0]} until ${format(parseISO(staying.checkOut), "d MMM")}`
                          : next
                            ? `Next: ${next.guest.name.split(" ")[0]} on ${format(parseISO(next.checkIn), "d MMM")}`
                            : "No upcoming stays"}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="space-y-12">
          <section>
            <SectionTitle>Needs attention</SectionTitle>
            {attention.length === 0 ? (
              <p className="text-sm text-neutral-400 font-medium">All clear.</p>
            ) : (
              <div className="space-y-2">
                {attention.slice(0, 6).map((a, i) => (
                  <button
                    key={i}
                    onClick={() => a.booking && setOpen(a.booking)}
                    className={cn("w-full flex items-start gap-3 p-3 -mx-3 rounded-xl text-left transition-colors", a.booking ? "hover:bg-neutral-50" : "cursor-default")}
                  >
                    <span className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", a.tone)}>
                      <a.icon className="w-4 h-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold truncate">{a.title}</span>
                      <span className="block text-xs text-neutral-400 font-medium truncate">{a.sub}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section>
            <SectionTitle
              action={
                <Link href="/dashboard/operations" className="text-xs font-semibold text-accent hover:text-indigo-700 flex items-center gap-0.5">
                  View all <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              }
            >
              Cleaning today
            </SectionTitle>
            {todayClean.length === 0 ? (
              <p className="text-sm text-neutral-400 font-medium">No cleaning scheduled.</p>
            ) : (
              <div className="space-y-2">
                {todayClean.map((c) => (
                  <button key={c.id} onClick={() => toggleCleaning(c.id)} className="w-full flex items-center gap-3 p-4 rounded-2xl bg-soft border border-neutral-100 text-left hover:border-neutral-200 transition-colors">
                    <span className={cn("w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors", c.done ? "bg-neutral-900 border-neutral-900" : "border-neutral-300 bg-white")}>
                      {c.done && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                    </span>
                    <span className="min-w-0">
                      <span className={cn("block text-sm font-semibold", c.done && "line-through text-neutral-400")}>{propertyById(c.propertyId).name}</span>
                      <span className="block text-xs text-neutral-400 font-medium">{c.assignee} · {c.note}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>

      <BookingDetail booking={open} onClose={() => setOpen(null)} />
    </div>
  );
}

function MoveRow({ b, kind, isOwner, onClick }: { b: Booking; kind: "in" | "out"; isOwner: boolean; onClick: () => void }) {
  const m = bookingMoney(b);
  return (
    <button onClick={onClick} className="w-full bg-white border border-neutral-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-neutral-200 transition-all flex flex-col lg:flex-row lg:items-center gap-4 text-left">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <Avatar name={b.guest.name} />
        <div className="min-w-0">
          <p className="font-bold tracking-tight truncate">
            {b.guest.name} <span className="font-normal">{b.guest.flag}</span>
          </p>
          <p className="text-sm text-neutral-500 font-medium truncate">{propertyById(b.propertyId).name}</p>
        </div>
      </div>
      <div className="flex items-center gap-6 lg:gap-8 shrink-0 border-t border-neutral-100 lg:border-0 pt-4 lg:pt-0">
        <div>
          <p className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider mb-1">{kind === "in" ? "Arriving" : "Leaving"}</p>
          <p className="text-sm font-semibold flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-neutral-400" />
            {kind === "in" ? b.arrival : "11:00"}
          </p>
        </div>
        {kind === "in" && b.pickup && (
          <div>
            <p className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider mb-1">Pickup</p>
            <p className="text-sm font-semibold flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5 text-neutral-400" /> Yes
            </p>
          </div>
        )}
        <div className="min-w-[120px]">
          {m.balance > 0 ? (
            <Badge tone="amber" dot>Collect {fmtLKRShort(m.balance)}</Badge>
          ) : (
            <Badge tone={kind === "in" ? "indigo" : "neutral"} dot>
              {kind === "in" ? (isOwner ? "Paid" : "Check in") : "Check out"}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}
