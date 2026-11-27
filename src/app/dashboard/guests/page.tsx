"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Search, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { bookingMoney, type Booking } from "@/lib/data";
import { cn, fmtLKR } from "@/lib/utils";
import { Avatar, Badge, Empty, PageHeader, inputCls } from "@/components/ui";
import { BookingDetail } from "@/components/booking-detail";

export default function GuestsPage() {
  const { user } = useAuth();
  const { bookings } = useStore();
  const isOwner = user!.role === "owner";
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Booking | null>(null);

  const guests = useMemo(() => {
    const map = new Map<string, { name: string; flag: string; country: string; phone: string; stays: Booking[]; spend: number }>();
    for (const b of bookings) {
      if (b.status === "cancelled") continue;
      const g = map.get(b.guest.name) ?? { ...b.guest, stays: [], spend: 0 };
      g.stays.push(b);
      g.spend += bookingMoney(b).net;
      map.set(b.guest.name, g);
    }
    return [...map.values()].sort((a, b) => b.stays.length - a.stays.length || a.name.localeCompare(b.name));
  }, [bookings]);

  const rows = guests.filter((g) => !q || `${g.name} ${g.country}`.toLowerCase().includes(q.toLowerCase()));
  const countries = new Set(guests.map((g) => g.country)).size;

  return (
    <div>
      <PageHeader
        title="Guests"
        subtitle={`${guests.length} guests from ${countries} countries.`}
        actions={
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search guests" className={cn(inputCls, "pl-10 w-64")} />
          </div>
        }
      />

      {rows.length === 0 ? (
        <Empty icon={Users} title="No guests found" text="Try a different name or country." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.map((g) => {
            const last = g.stays[g.stays.length - 1];
            return (
              <button key={g.name} onClick={() => setOpen(last)} className="text-left bg-white border border-neutral-100 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-neutral-200 transition-all">
                <div className="flex items-center gap-4 mb-6">
                  <Avatar name={g.name} />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold tracking-tight truncate">{g.name}</p>
                    <p className="text-sm text-neutral-500 font-medium truncate">
                      {g.flag} {g.country}
                    </p>
                  </div>
                  {g.stays.length > 1 && <Badge tone="indigo">Returning</Badge>}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <Mini label="Stays" value={String(g.stays.length)} />
                  <Mini label="Last stay" value={format(parseISO(last.checkIn), "d MMM")} />
                  {isOwner ? <Mini label="Spent" value={fmtLKR(g.spend).replace("LKR ", "")} /> : <Mini label="Phone" value={g.phone.slice(0, 7) + "…"} />}
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

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider mb-1">{label}</p>
      <p className="text-sm font-semibold truncate">{value}</p>
    </div>
  );
}
