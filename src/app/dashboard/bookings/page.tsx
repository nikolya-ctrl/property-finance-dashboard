"use client";

import { useMemo, useState } from "react";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { BedDouble, Plus, Search } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { CHANNELS, PROPERTIES, bookingMoney, iso, propertyById, today, type Booking, type ChannelId } from "@/lib/mock-data";
import { cn, fmtLKR } from "@/lib/utils";
import { Avatar, Badge, Button, ChannelTag, Empty, PageHeader, Segmented, StatusBadge, inputCls } from "@/components/ui";
import { BookingDetail } from "@/components/booking-detail";

type Tab = "upcoming" | "staying" | "past" | "cancelled";

export default function BookingsPage() {
  const { user } = useAuth();
  const { bookings, setNewBookingOpen } = useStore();
  const isOwner = user!.role === "owner";
  const [tab, setTab] = useState<Tab>("upcoming");
  const [q, setQ] = useState("");
  const [prop, setProp] = useState("all");
  const [channel, setChannel] = useState<ChannelId | "all">("all");
  const [open, setOpen] = useState<Booking | null>(null);
  const t = iso(today());

  const groups = useMemo(() => {
    const g: Record<Tab, Booking[]> = { upcoming: [], staying: [], past: [], cancelled: [] };
    for (const b of bookings) {
      if (b.status === "cancelled") g.cancelled.push(b);
      else if (b.checkIn <= t && b.checkOut >= t && b.status !== "completed") g.staying.push(b);
      else if (b.checkIn > t) g.upcoming.push(b);
      else g.past.push(b);
    }
    g.past.reverse();
    return g;
  }, [bookings, t]);

  const rows = groups[tab].filter(
    (b) =>
      (prop === "all" || b.propertyId === prop) &&
      (channel === "all" || b.channel === channel) &&
      (!q || `${b.guest.name} ${b.ref} ${b.guest.country}`.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div>
      <PageHeader
        title="Bookings"
        subtitle="All stays from Booking.com, Airbnb, Agoda and direct guests."
        actions={
          <Button onClick={() => setNewBookingOpen(true)}>
            <Plus className="w-4 h-4" /> New booking
          </Button>
        }
      />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
        <Segmented
          id="bookings"
          value={tab}
          onChange={setTab}
          options={[
            { value: "upcoming", label: "Upcoming", count: groups.upcoming.length },
            { value: "staying", label: "Staying", count: groups.staying.length },
            { value: "past", label: "Past", count: groups.past.length },
            { value: "cancelled", label: "Cancelled", count: groups.cancelled.length },
          ]}
        />
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search guest or ref" className={cn(inputCls, "pl-10 sm:w-56")} />
          </div>
          <select value={prop} onChange={(e) => setProp(e.target.value)} className={cn(inputCls, "sm:w-44")}>
            <option value="all">All apartments</option>
            {PROPERTIES.filter((p) => p.status === "operating").map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select value={channel} onChange={(e) => setChannel(e.target.value as ChannelId | "all")} className={cn(inputCls, "sm:w-40")}>
            <option value="all">All platforms</option>
            {CHANNELS.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {rows.length === 0 ? (
        <Empty icon={BedDouble} title="No bookings here" text="Try another tab or clear the filters." />
      ) : (
        <div className="space-y-3">
          {rows.map((b) => {
            const m = bookingMoney(b);
            const nights = differenceInCalendarDays(parseISO(b.checkOut), parseISO(b.checkIn));
            return (
              <button
                key={b.id}
                onClick={() => setOpen(b)}
                className="w-full bg-white border border-neutral-100 rounded-2xl p-5 md:px-6 shadow-sm hover:shadow-md hover:border-neutral-200 transition-all grid grid-cols-1 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-4 md:gap-6 text-left"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <Avatar name={b.guest.name} />
                  <div className="min-w-0">
                    <p className="font-bold tracking-tight truncate">
                      {b.guest.name} <span className="font-normal">{b.guest.flag}</span>
                    </p>
                    <p className="text-sm text-neutral-500 font-medium truncate flex items-center gap-2">
                      {propertyById(b.propertyId).name}
                      <span className="w-1 h-1 bg-neutral-300 rounded-full" />
                      <span className="text-neutral-400 font-mono text-xs">{b.ref}</span>
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider mb-1">Dates</p>
                  <p className="text-sm font-semibold">
                    {format(parseISO(b.checkIn), "d MMM")} – {format(parseISO(b.checkOut), "d MMM")}
                    <span className="text-neutral-400 font-medium"> · {nights}n</span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider mb-1">{isOwner ? "Net" : "Platform"}</p>
                  {isOwner ? (
                    <p className="text-sm font-semibold">{fmtLKR(m.net)}</p>
                  ) : (
                    <ChannelTag id={b.channel} />
                  )}
                </div>
                <div className="flex md:flex-col items-center md:items-end gap-2 md:min-w-[130px]">
                  <StatusBadge status={b.status} />
                  {isOwner && <ChannelTag id={b.channel} className="md:text-[11px]" />}
                  {m.balance > 0 && <Badge tone="amber">Due {fmtLKR(m.balance)}</Badge>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <BookingDetail booking={open} onClose={() => setOpen(null)} />
    </div>
  );
}
