"use client";

import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { Car, Clock, Mail, MapPin, MessageCircle, Moon, Phone, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { bookingMoney, channelById, propertyById, type Booking } from "@/lib/mock-data";
import { fmtLKR, fmtUSD } from "@/lib/utils";
import { Badge, Button, ChannelTag, Drawer, StatusBadge } from "./ui";

export function BookingDetail({ booking, onClose }: { booking: Booking | null; onClose: () => void }) {
  const { user } = useAuth();
  const { setStatus, bookings } = useStore();
  const b = booking ? bookings.find((x) => x.id === booking.id) ?? booking : null;
  const isOwner = user?.role === "owner";

  return (
    <Drawer open={!!b} onClose={onClose} title={b?.guest.name ?? ""} subtitle={b ? `${b.ref} · ${propertyById(b.propertyId).name}` : ""}
      footer={
        b && (
          <div className="flex flex-wrap gap-2 justify-end">
            {b.status === "confirmed" && (
              <>
                {isOwner && (
                  <Button variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setStatus(b.id, "cancelled")}>
                    Cancel booking
                  </Button>
                )}
                <Button onClick={() => setStatus(b.id, "checked_in")}>Check in</Button>
              </>
            )}
            {b.status === "checked_in" && <Button onClick={() => setStatus(b.id, "completed")}>Check out</Button>}
            {b.status === "enquiry" && <Button onClick={() => setStatus(b.id, "confirmed")}>Confirm booking</Button>}
          </div>
        )
      }
    >
      {b && <Body b={b} isOwner={isOwner} />}
    </Drawer>
  );
}

function Body({ b, isOwner }: { b: Booking; isOwner: boolean }) {
  const p = propertyById(b.propertyId);
  const nights = differenceInCalendarDays(parseISO(b.checkOut), parseISO(b.checkIn));
  const m = bookingMoney(b);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={b.status} />
        <ChannelTag id={b.channel} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Tile label="Check-in" value={format(parseISO(b.checkIn), "EEE d MMM")} sub={`from ${b.arrival}`} />
        <Tile label="Check-out" value={format(parseISO(b.checkOut), "EEE d MMM")} sub="by 11:00" />
      </div>

      <ul className="space-y-3.5 text-sm">
        <Line icon={MapPin} text={`${p.name}, ${p.location}`} />
        <Line icon={Moon} text={`${nights} night${nights > 1 ? "s" : ""}`} />
        <Line icon={Users} text={`${b.adults} adult${b.adults > 1 ? "s" : ""}${b.children ? ` · ${b.children} child` : ""}`} />
        <Line icon={Clock} text={`Expected arrival ${b.arrival}`} />
        {b.pickup && <Line icon={Car} text="Airport pickup booked" />}
      </ul>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-3">Guest</p>
        <div className="bg-soft border border-neutral-100 rounded-2xl p-5 space-y-3 text-sm">
          <p className="font-semibold text-ink">
            {b.guest.flag} {b.guest.name} <span className="text-neutral-400 font-medium">· {b.guest.country}</span>
          </p>
          {b.guest.phone && <Line icon={Phone} text={b.guest.phone} />}
          {b.guest.email && <Line icon={Mail} text={b.guest.email} />}
          {b.notes && <p className="text-neutral-500 font-medium pt-1">“{b.notes}”</p>}
          {b.guest.phone && (
            <a className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg" href="#" onClick={(e) => e.preventDefault()}>
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp guest
            </a>
          )}
        </div>
      </div>

      {isOwner ? (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-3">Money</p>
          <div className="border border-neutral-100 rounded-2xl p-5 space-y-2.5 text-sm">
            <Row label={`Room (${b.currency === "USD" ? `$${b.gross.toLocaleString()}` : fmtLKR(b.gross)})`} value={fmtLKR(m.grossLKR)} />
            <Row label={`${channelById(b.channel).name} commission ${b.commissionPct}%`} value={`− ${fmtLKR(m.commission)}`} muted />
            {b.extras.map((e) => (
              <Row key={e.label} label={e.label} value={`+ ${fmtLKR(e.amount)}`} muted />
            ))}
            <div className="border-t border-neutral-100 pt-3 mt-1 flex items-end justify-between">
              <span className="font-semibold text-ink">Net earnings</span>
              <span className="text-right">
                <span className="block text-lg font-bold tracking-tight">{fmtLKR(m.net)}</span>
                <span className="block text-[11px] text-neutral-400 font-medium">{fmtUSD(m.net)}</span>
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {m.balance > 0 ? <Badge tone="amber" dot>Balance due {fmtLKR(m.balance)}</Badge> : <Badge tone="green" dot>Guest fully paid</Badge>}
            {b.payout === "pending" && <Badge tone="blue" dot>Payout pending</Badge>}
            {b.payout === "late" && <Badge tone="red" dot>Payout late</Badge>}
            {b.payout === "received" && <Badge tone="green" dot>Payout received</Badge>}
          </div>
        </div>
      ) : (
        m.balance > 0 && (
          <div className="p-4 rounded-2xl bg-amber-50 text-amber-800 text-sm font-medium">
            Collect {fmtLKR(m.balance)} from the guest at check-in.
          </div>
        )
      )}
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-soft border border-neutral-100 rounded-2xl p-4">
      <p className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider mb-1.5">{label}</p>
      <p className="font-bold tracking-tight">{value}</p>
      <p className="text-xs text-neutral-400 font-medium mt-0.5">{sub}</p>
    </div>
  );
}

function Line({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <li className="flex items-center gap-3 text-neutral-600 font-medium list-none">
      <Icon className="w-4 h-4 text-neutral-400 shrink-0" />
      {text}
    </li>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-neutral-500 font-medium">{label}</span>
      <span className={muted ? "text-neutral-500 font-medium" : "font-semibold"}>{value}</span>
    </div>
  );
}
