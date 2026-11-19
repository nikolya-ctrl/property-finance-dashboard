"use client";

import { useEffect, useMemo, useState } from "react";
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { CHANNELS, PROPERTIES, channelById, iso, propertyById, today, type Booking, type ChannelId } from "@/lib/mock-data";
import { cn, fmtLKR, fmtUSD, toLKR } from "@/lib/utils";
import { Button, Drawer, Field, inputCls } from "./ui";

const empty = () => ({
  propertyId: "kandy",
  channel: "booking" as ChannelId,
  checkIn: iso(addDays(today(), 7)),
  checkOut: iso(addDays(today(), 10)),
  name: "",
  phone: "",
  country: "",
  adults: 2,
  children: 0,
  arrival: "14:00",
  pickup: false,
  currency: "USD" as "USD" | "LKR",
  gross: "",
  deposit: "",
  notes: "",
});

export function NewBookingDrawer() {
  const { newBookingOpen, setNewBookingOpen, bookings, addBooking } = useStore();
  const { user } = useAuth();
  const [f, setF] = useState(empty);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (newBookingOpen) {
      setF(empty());
      setSaved(false);
    }
  }, [newBookingOpen]);

  const set = <K extends keyof ReturnType<typeof empty>>(k: K, v: ReturnType<typeof empty>[K]) =>
    setF((x) => ({ ...x, [k]: v }));

  const nights = Math.max(0, differenceInCalendarDays(parseISO(f.checkOut), parseISO(f.checkIn)));
  const clash = useMemo(
    () =>
      bookings.find(
        (b) =>
          b.propertyId === f.propertyId &&
          (b.status === "confirmed" || b.status === "checked_in") &&
          b.checkIn < f.checkOut &&
          f.checkIn < b.checkOut
      ),
    [bookings, f.propertyId, f.checkIn, f.checkOut]
  );

  const channel = channelById(f.channel);
  const grossNum = Number(f.gross) || 0;
  const grossLKR = toLKR(grossNum, f.currency);
  const commission = Math.round((grossLKR * channel.commission) / 100);
  const isOwner = user?.role === "owner";
  const valid = f.name.trim() && nights > 0 && !clash && grossNum > 0;

  const save = () => {
    const n = 2000 + bookings.length;
    const b: Booking = {
      id: `new${n}`,
      ref: `HV-${n}`,
      propertyId: f.propertyId,
      channel: f.channel,
      guest: { name: f.name.trim(), country: f.country || "—", flag: "🏳️", phone: f.phone, email: "" },
      adults: f.adults,
      children: f.children,
      checkIn: f.checkIn,
      checkOut: f.checkOut,
      arrival: f.arrival,
      pickup: f.pickup,
      status: "confirmed",
      currency: f.currency,
      gross: grossNum,
      commissionPct: channel.commission,
      extras: [],
      paid: Number(f.deposit) || 0,
      payout: f.channel === "direct" ? "n/a" : "pending",
      notes: f.notes || undefined,
    };
    addBooking(b);
    setSaved(true);
    setTimeout(() => setNewBookingOpen(false), 900);
  };

  return (
    <Drawer
      open={newBookingOpen}
      onClose={() => setNewBookingOpen(false)}
      title="New booking"
      subtitle="Add a stay from any platform or a direct enquiry."
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-neutral-400 font-medium">Demo only, nothing is saved</span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setNewBookingOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={!valid || saved}>
              {saved ? (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Saved
                </>
              ) : (
                "Save booking"
              )}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-8">
        <section className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Stay</p>
          <Field label="Apartment">
            <select className={inputCls} value={f.propertyId} onChange={(e) => set("propertyId", e.target.value)}>
              {PROPERTIES.map((p) => (
                <option key={p.id} value={p.id} disabled={p.status !== "operating"}>
                  {p.name} · {p.location}
                  {p.status !== "operating" ? " (opening soon)" : ""}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Check-in">
              <input type="date" className={inputCls} value={f.checkIn} onChange={(e) => set("checkIn", e.target.value)} />
            </Field>
            <Field label="Check-out">
              <input type="date" className={inputCls} value={f.checkOut} onChange={(e) => set("checkOut", e.target.value)} />
            </Field>
          </div>

          <div
            className={cn(
              "flex items-start gap-2.5 p-3.5 rounded-xl text-xs font-medium border",
              clash ? "bg-red-50 border-red-100 text-red-600" : nights > 0 ? "bg-emerald-50/60 border-emerald-100 text-emerald-700" : "bg-soft border-neutral-100 text-neutral-500"
            )}
          >
            {clash ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
            <span>
              {clash
                ? `Overlaps ${clash.ref}: ${clash.guest.name}, ${channelById(clash.channel).name}, ${format(parseISO(clash.checkIn), "d MMM")} – ${format(parseISO(clash.checkOut), "d MMM")}. Pick other dates.`
                : nights > 0
                  ? `${propertyById(f.propertyId).name} is free · ${nights} night${nights > 1 ? "s" : ""}`
                  : "Check-out must be after check-in"}
            </span>
          </div>

          <Field label="Booked via">
            <div className="flex flex-wrap gap-2">
              {CHANNELS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => set("channel", c.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors",
                    f.channel === c.id ? "border-neutral-900 bg-white text-ink" : "border-neutral-200/80 bg-neutral-50/70 text-neutral-500 hover:text-ink"
                  )}
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                  {c.name}
                </button>
              ))}
            </div>
          </Field>
        </section>

        <section className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Guest</p>
          <Field label="Full name">
            <input className={inputCls} placeholder="e.g. Emma Schneider" value={f.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone / WhatsApp">
              <input className={inputCls} placeholder="+94 77 …" value={f.phone} onChange={(e) => set("phone", e.target.value)} />
            </Field>
            <Field label="Country">
              <input className={inputCls} placeholder="Germany" value={f.country} onChange={(e) => set("country", e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Adults">
              <input type="number" min={1} className={inputCls} value={f.adults} onChange={(e) => set("adults", Number(e.target.value))} />
            </Field>
            <Field label="Children">
              <input type="number" min={0} className={inputCls} value={f.children} onChange={(e) => set("children", Number(e.target.value))} />
            </Field>
            <Field label="Arrival">
              <input type="time" className={inputCls} value={f.arrival} onChange={(e) => set("arrival", e.target.value)} />
            </Field>
          </div>
          <label className="flex items-center gap-3 text-sm font-medium text-neutral-700 cursor-pointer select-none">
            <input type="checkbox" checked={f.pickup} onChange={(e) => set("pickup", e.target.checked)} className="w-4 h-4 accent-neutral-900" />
            Airport pickup needed
          </label>
        </section>

        <section className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Price</p>
          <div className="grid grid-cols-[110px_1fr] gap-3">
            <Field label="Currency">
              <select className={inputCls} value={f.currency} onChange={(e) => set("currency", e.target.value as "USD" | "LKR")}>
                <option>USD</option>
                <option>LKR</option>
              </select>
            </Field>
            <Field label="Total for the stay">
              <input type="number" min={0} className={inputCls} placeholder="0" value={f.gross} onChange={(e) => set("gross", e.target.value)} />
            </Field>
          </div>
          {f.channel === "direct" && (
            <Field label="Deposit received (LKR)">
              <input type="number" min={0} className={inputCls} placeholder="0" value={f.deposit} onChange={(e) => set("deposit", e.target.value)} />
            </Field>
          )}
          {isOwner && grossNum > 0 && (
            <div className="bg-soft border border-neutral-100 rounded-xl p-4 space-y-2 text-sm">
              <Row label="Gross" value={`${fmtLKR(grossLKR)} · ${fmtUSD(grossLKR)}`} />
              <Row label={`${channel.name} commission (${channel.commission}%)`} value={`− ${fmtLKR(commission)}`} />
              <div className="border-t border-neutral-200/70 pt-2">
                <Row label="You earn" value={fmtLKR(grossLKR - commission)} strong />
              </div>
            </div>
          )}
          {!isOwner && <p className="text-[11px] text-neutral-400 font-medium">Only owners can see commission and earnings.</p>}
          <Field label="Notes">
            <textarea rows={3} className={cn(inputCls, "resize-none")} placeholder="Special requests, arrival details…" value={f.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>
        </section>
      </div>
    </Drawer>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={cn("text-neutral-500 font-medium", strong && "text-ink font-semibold")}>{label}</span>
      <span className={cn("font-semibold text-neutral-700", strong && "text-ink font-bold")}>{value}</span>
    </div>
  );
}
