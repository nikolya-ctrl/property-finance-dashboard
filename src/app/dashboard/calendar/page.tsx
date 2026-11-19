"use client";

import { useMemo, useState } from "react";
import { addMonths, differenceInCalendarDays, eachDayOfInterval, endOfMonth, format, isSameDay, isWeekend, parseISO, startOfMonth } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { CHANNELS, PROPERTIES, channelById, today, type Booking } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Button, PageHeader } from "@/components/ui";
import { BookingDetail } from "@/components/booking-detail";

const DAY_W = 44;

export default function CalendarPage() {
  const { bookings } = useStore();
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [open, setOpen] = useState<Booking | null>(null);
  const days = useMemo(() => eachDayOfInterval({ start: month, end: endOfMonth(month) }), [month]);
  const t = today();

  return (
    <div>
      <PageHeader
        title="Calendar"
        subtitle="Every stay across all apartments, coloured by platform."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setMonth(startOfMonth(new Date()))}>
              Today
            </Button>
            <div className="flex items-center bg-soft border border-neutral-100 rounded-xl p-1">
              <button onClick={() => setMonth((m) => addMonths(m, -1))} className="p-2 rounded-lg hover:bg-white text-neutral-500 hover:text-ink transition-colors" aria-label="Previous month">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-sm font-semibold min-w-[130px] text-center">{format(month, "MMMM yyyy")}</span>
              <button onClick={() => setMonth((m) => addMonths(m, 1))} className="p-2 rounded-lg hover:bg-white text-neutral-500 hover:text-ink transition-colors" aria-label="Next month">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        }
      />

      <div className="border border-neutral-100 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <div style={{ width: 220 + days.length * DAY_W }}>
            {/* header */}
            <div className="flex border-b border-neutral-100 bg-soft">
              <div className="w-[220px] shrink-0 sticky left-0 bg-soft z-20 px-5 flex items-center text-[11px] font-semibold uppercase tracking-wider text-neutral-400 border-r border-neutral-100">
                Apartment
              </div>
              {days.map((d) => (
                <div key={d.toISOString()} style={{ width: DAY_W }} className={cn("shrink-0 text-center py-3", isWeekend(d) && "bg-neutral-100/50")}>
                  <p className="text-[10px] font-semibold uppercase text-neutral-400">{format(d, "EEEEE")}</p>
                  <p className={cn("text-xs font-bold mt-1 w-6 h-6 mx-auto flex items-center justify-center rounded-md", isSameDay(d, t) ? "bg-neutral-900 text-white" : "text-neutral-700")}>
                    {format(d, "d")}
                  </p>
                </div>
              ))}
            </div>

            {PROPERTIES.map((p) => {
              const rows = bookings.filter(
                (b) =>
                  b.propertyId === p.id &&
                  b.status !== "cancelled" &&
                  parseISO(b.checkOut) > month &&
                  parseISO(b.checkIn) <= endOfMonth(month)
              );
              return (
                <div key={p.id} className="flex border-b border-neutral-100 last:border-0">
                  <div className="w-[220px] shrink-0 sticky left-0 bg-white z-20 px-5 py-5 border-r border-neutral-100">
                    <p className="text-sm font-semibold truncate">{p.name}</p>
                    <p className="text-xs text-neutral-400 font-medium">{p.status === "operating" ? p.location : "Opening soon"}</p>
                  </div>
                  <div className="relative flex" style={{ width: days.length * DAY_W }}>
                    {days.map((d) => (
                      <div key={d.toISOString()} style={{ width: DAY_W }} className={cn("shrink-0 h-full", isWeekend(d) && "bg-neutral-50/70", isSameDay(d, t) && "bg-indigo-50/40")} />
                    ))}
                    {p.status !== "operating" && (
                      <div className="absolute inset-0 m-3 rounded-xl border border-dashed border-neutral-200 bg-[repeating-linear-gradient(135deg,transparent,transparent_6px,rgba(0,0,0,0.02)_6px,rgba(0,0,0,0.02)_12px)]" />
                    )}
                    {rows.map((b) => {
                      const ci = differenceInCalendarDays(parseISO(b.checkIn), month);
                      const co = differenceInCalendarDays(parseISO(b.checkOut), month);
                      const left = Math.max(0, (ci + 0.5) * DAY_W) + 2;
                      const right = Math.min(days.length * DAY_W, (co + 0.5) * DAY_W) - 2;
                      const ch = channelById(b.channel);
                      return (
                        <button
                          key={b.id}
                          onClick={() => setOpen(b)}
                          title={`${b.guest.name} · ${ch.name}`}
                          className={cn(
                            "absolute top-3 bottom-3 rounded-xl px-2.5 text-left overflow-hidden transition-all hover:-translate-y-px hover:shadow-md",
                            b.status === "enquiry" && "border border-dashed"
                          )}
                          style={{
                            left,
                            width: right - left,
                            background: b.status === "enquiry" ? "white" : `${ch.color}14`,
                            borderColor: ch.color,
                            boxShadow: `inset 3px 0 0 ${ch.color}`,
                          }}
                        >
                          <p className="text-xs font-semibold truncate text-ink pt-2">{b.guest.name.split(" ")[0]}</p>
                          <p className="text-[10px] font-medium truncate text-neutral-500">{ch.name}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-6">
        {CHANNELS.map((c) => (
          <span key={c.id} className="inline-flex items-center gap-2 text-xs font-medium text-neutral-500">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
            {c.name}
          </span>
        ))}
        <span className="inline-flex items-center gap-2 text-xs font-medium text-neutral-500">
          <span className="w-2.5 h-2.5 rounded-full border border-dashed border-neutral-400" />
          Enquiry (not confirmed)
        </span>
      </div>

      <BookingDetail booking={open} onClose={() => setOpen(null)} />
    </div>
  );
}
