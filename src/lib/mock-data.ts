/**
 * DEMO DATA, entirely made up. Dates are generated relative to today
 * so the dashboard always has upcoming check-ins to show.
 */
import { addDays, format, startOfDay } from "date-fns";

export type ChannelId = "booking" | "airbnb" | "agoda" | "direct" | "tripadvisor";
export type BookingStatus = "enquiry" | "confirmed" | "checked_in" | "completed" | "cancelled";
export type PayoutStatus = "n/a" | "pending" | "received" | "late";

export type Property = {
  id: string;
  name: string;
  location: string;
  region: string;
  status: "operating" | "setup";
  maxGuests: number;
  baseRate: number; // LKR per night
};

export type Channel = { id: ChannelId; name: string; color: string; commission: number; payoutDays: number };

export type Booking = {
  id: string;
  ref: string;
  propertyId: string;
  channel: ChannelId;
  guest: { name: string; country: string; flag: string; phone: string; email: string };
  adults: number;
  children: number;
  checkIn: string; // yyyy-MM-dd
  checkOut: string;
  arrival: string;
  pickup: boolean;
  status: BookingStatus;
  currency: "LKR" | "USD";
  gross: number; // in booking currency
  commissionPct: number;
  extras: { label: string; amount: number }[]; // LKR
  paid: number; // LKR received from guest directly
  payout: PayoutStatus;
  notes?: string;
};

export type Expense = {
  id: string;
  date: string;
  propertyId: string | null;
  category: string;
  note: string;
  amount: number; // LKR
  by: string;
};

export type CleaningTask = { id: string; propertyId: string; date: string; assignee: string; done: boolean; note: string };
export type Issue = {
  id: string;
  propertyId: string;
  title: string;
  priority: "low" | "medium" | "urgent";
  status: "open" | "in_progress" | "fixed";
  reported: string;
  cost?: number;
};
export type InventoryItem = { id: string; propertyId: string; name: string; unit: string; qty: number; low: number };

export const PROPERTIES: Property[] = [
  { id: "kandy", name: "Hillside Residence", location: "Kandy", region: "Central", status: "operating", maxGuests: 4, baseRate: 24000 },
  { id: "mirissa", name: "Ocean Loft", location: "Mirissa", region: "South", status: "operating", maxGuests: 3, baseRate: 32000 },
  { id: "nuwara", name: "Tea Country Cottage", location: "Nuwara Eliya", region: "Hill Country", status: "setup", maxGuests: 5, baseRate: 28000 },
  { id: "galle", name: "Fort Studio", location: "Galle", region: "South", status: "setup", maxGuests: 2, baseRate: 26000 },
  { id: "ella", name: "Ridge View Villa", location: "Ella", region: "Uva", status: "setup", maxGuests: 6, baseRate: 35000 },
];

export const CHANNELS: Channel[] = [
  { id: "booking", name: "Booking.com", color: "#3B82F6", commission: 15, payoutDays: 5 },
  { id: "airbnb", name: "Airbnb", color: "#F43F5E", commission: 3, payoutDays: 1 },
  { id: "agoda", name: "Agoda", color: "#F59E0B", commission: 17, payoutDays: 30 },
  { id: "direct", name: "Direct", color: "#10B981", commission: 0, payoutDays: 0 },
  { id: "tripadvisor", name: "TripAdvisor", color: "#14B8A6", commission: 12, payoutDays: 14 },
];

export const channelById = (id: ChannelId) => CHANNELS.find((c) => c.id === id)!;
export const propertyById = (id: string) => PROPERTIES.find((p) => p.id === id)!;

// Seeded random so the demo data is the same on every load
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GUESTS = [
  { name: "Emma Schneider", country: "Germany", flag: "🇩🇪" },
  { name: "Liam O'Connor", country: "Ireland", flag: "🇮🇪" },
  { name: "Sofia Rossi", country: "Italy", flag: "🇮🇹" },
  { name: "Kavindu Silva", country: "Sri Lanka", flag: "🇱🇰" },
  { name: "Hannah Brooks", country: "United Kingdom", flag: "🇬🇧" },
  { name: "Arjun Mehta", country: "India", flag: "🇮🇳" },
  { name: "Chloé Martin", country: "France", flag: "🇫🇷" },
  { name: "Noah Williams", country: "Australia", flag: "🇦🇺" },
  { name: "Yuki Tanaka", country: "Japan", flag: "🇯🇵" },
  { name: "Tharushi Jayasinghe", country: "Sri Lanka", flag: "🇱🇰" },
  { name: "Lukas Novák", country: "Czechia", flag: "🇨🇿" },
  { name: "Olivia Chen", country: "Singapore", flag: "🇸🇬" },
  { name: "Mateo García", country: "Spain", flag: "🇪🇸" },
  { name: "Freya Larsen", country: "Denmark", flag: "🇩🇰" },
  { name: "Ravi Kumar", country: "India", flag: "🇮🇳" },
  { name: "Isabella Moore", country: "Canada", flag: "🇨🇦" },
  { name: "Daniel Weber", country: "Switzerland", flag: "🇨🇭" },
  { name: "Ama Wickramasinghe", country: "Sri Lanka", flag: "🇱🇰" },
  { name: "Jack Thompson", country: "New Zealand", flag: "🇳🇿" },
  { name: "Mia Johansson", country: "Sweden", flag: "🇸🇪" },
];

export const iso = (d: Date) => format(d, "yyyy-MM-dd");
export const today = () => startOfDay(new Date());

function buildBookings(): Booking[] {
  const r = rng(42);
  const t = today();
  const out: Booking[] = [];
  let n = 1001;
  const channelPool: ChannelId[] = ["booking", "booking", "airbnb", "airbnb", "agoda", "direct", "direct", "tripadvisor"];
  const arrivals = ["11:30", "13:00", "14:00", "15:30", "17:00", "19:30"];

  for (const p of PROPERTIES.filter((x) => x.status === "operating")) {
    // first stay ends today for one property so there is a check-out today
    let cursor = addDays(t, p.id === "kandy" ? -95 : -92);
    let gi = p.id === "kandy" ? 0 : 7;
    while (cursor < addDays(t, 50)) {
      const nights = 2 + Math.floor(r() * 4);
      const gap = Math.floor(r() * 3);
      let ci = addDays(cursor, gap);
      // make sure there is an arrival today (kandy) and tomorrow (mirissa)
      const target = p.id === "kandy" ? t : addDays(t, 1);
      if (ci < target && addDays(ci, nights) > target && addDays(ci, nights) < addDays(target, 2)) {
        ci = target;
      }
      const co = addDays(ci, nights);
      const ch = channelPool[Math.floor(r() * channelPool.length)];
      const channel = CHANNELS.find((c) => c.id === ch)!;
      const g = GUESTS[gi % GUESTS.length];
      gi += 1;
      const usd = ch !== "direct" || r() > 0.5;
      const nightly = p.baseRate * (0.85 + r() * 0.35);
      const grossLKR = Math.round((nightly * nights) / 500) * 500;
      const currency: "LKR" | "USD" = usd ? "USD" : "LKR";
      const gross = currency === "USD" ? Math.round(grossLKR / 300) : grossLKR;
      const extras: Booking["extras"] = [];
      const pickup = r() > 0.6;
      if (pickup) extras.push({ label: "Airport pickup", amount: p.id === "kandy" ? 12000 : 15000 });
      if (r() > 0.7) extras.push({ label: "Breakfast", amount: 2500 * nights });
      if (r() > 0.85) extras.push({ label: "Tour", amount: 9000 });

      let status: BookingStatus;
      if (co <= t && !(iso(co) === iso(t))) status = "completed";
      else if (ci <= t && co > t) status = "checked_in";
      else if (iso(co) === iso(t)) status = "checked_in";
      else status = "confirmed";
      if (r() > 0.94 && ci > t) status = "cancelled";
      if (r() > 0.93 && ci > addDays(t, 20)) status = "enquiry";

      const extrasTotal = extras.reduce((s, e) => s + e.amount, 0);
      let paid = 0;
      if (ch === "direct") {
        if (status === "completed") paid = grossLKR + extrasTotal;
        else if (status === "checked_in") paid = Math.round(grossLKR * (r() > 0.5 ? 1 : 0.3));
        else paid = r() > 0.4 ? Math.round(grossLKR * 0.3) : 0;
      } else {
        paid = status === "completed" ? extrasTotal : 0;
      }

      let payout: PayoutStatus = "n/a";
      if (ch !== "direct") {
        const due = addDays(ci, channel.payoutDays);
        if (status === "completed" || status === "checked_in") {
          payout = due < addDays(t, -6) ? "received" : due < t ? (r() > 0.5 ? "late" : "received") : "pending";
        } else if (status === "confirmed") payout = "pending";
      }

      out.push({
        id: `b${n}`,
        ref: `HV-${n}`,
        propertyId: p.id,
        channel: ch,
        guest: {
          ...g,
          phone: g.country === "Sri Lanka" ? `+94 7${Math.floor(r() * 9)} ${Math.floor(100 + r() * 899)} ${Math.floor(1000 + r() * 8999)}` : `+${Math.floor(10 + r() * 80)} ${Math.floor(100 + r() * 899)} ${Math.floor(100000 + r() * 899999)}`,
          email: g.name.toLowerCase().replace(/[^a-z]+/g, ".") + "@mail.test",
        },
        adults: 1 + Math.floor(r() * Math.min(3, p.maxGuests)),
        children: r() > 0.75 ? 1 : 0,
        checkIn: iso(ci),
        checkOut: iso(co),
        arrival: arrivals[Math.floor(r() * arrivals.length)],
        pickup,
        status,
        currency,
        gross,
        commissionPct: channel.commission,
        extras,
        paid,
        payout,
        notes: r() > 0.75 ? ["Honeymoon couple, flowers on arrival", "Late check-out requested", "Vegetarian breakfast", "Needs baby cot", "Arriving by train from Colombo"][Math.floor(r() * 5)] : undefined,
      });
      n += 1;
      cursor = co;
    }
  }
  return out.sort((a, b) => a.checkIn.localeCompare(b.checkIn));
}

export const BOOKINGS: Booking[] = buildBookings();

/** Money helpers for a booking, all in LKR */
export function bookingMoney(b: Booking) {
  const grossLKR = b.currency === "USD" ? b.gross * 300 : b.gross;
  const commission = Math.round((grossLKR * b.commissionPct) / 100);
  const extras = b.extras.reduce((s, e) => s + e.amount, 0);
  const net = grossLKR - commission + extras;
  // For platform bookings the room is prepaid via the platform; the guest owes us only extras.
  const owedByGuest = b.channel === "direct" ? grossLKR + extras : extras;
  const balance = b.status === "cancelled" || b.status === "enquiry" ? 0 : Math.max(0, owedByGuest - b.paid);
  return { grossLKR, commission, extras, net, balance };
}

function buildExpenses(): Expense[] {
  const r = rng(7);
  const t = today();
  const out: Expense[] = [];
  let id = 1;
  for (let m = 3; m >= 0; m--) {
    const base = addDays(t, -30 * m);
    const day = (d: number) => iso(addDays(base, -d));
    for (const p of ["kandy", "mirissa"]) {
      out.push({ id: `e${id++}`, date: day(2), propertyId: p, category: "Staff salaries", note: "Caretaker salary", amount: 45000, by: "Ayesha Fernando" });
      out.push({ id: `e${id++}`, date: day(5), propertyId: p, category: "Electricity", note: "CEB bill", amount: Math.round(14000 + r() * 9000), by: "Ayesha Fernando" });
      out.push({ id: `e${id++}`, date: day(6), propertyId: p, category: "Water", note: "NWSDB bill", amount: Math.round(2500 + r() * 1500), by: "Ayesha Fernando" });
      out.push({ id: `e${id++}`, date: day(8), propertyId: p, category: "Internet", note: "Fibre plan", amount: 6900, by: "Ayesha Fernando" });
      out.push({ id: `e${id++}`, date: day(10), propertyId: p, category: "Cleaning & laundry", note: "Laundry service", amount: Math.round(8000 + r() * 6000), by: "Nimal Perera" });
      out.push({ id: `e${id++}`, date: day(14), propertyId: p, category: "Supplies", note: "Toiletries & kitchen", amount: Math.round(5000 + r() * 7000), by: "Nimal Perera" });
      if (r() > 0.5) out.push({ id: `e${id++}`, date: day(18), propertyId: p, category: "Repairs", note: ["AC service", "Plumber visit", "Replaced door lock", "Garden maintenance"][Math.floor(r() * 4)], amount: Math.round(6000 + r() * 18000), by: "Nimal Perera" });
    }
    out.push({ id: `e${id++}`, date: day(1), propertyId: "kandy", category: "Rent & lease", note: "Monthly lease", amount: 85000, by: "Ayesha Fernando" });
    out.push({ id: `e${id++}`, date: day(1), propertyId: "mirissa", category: "Rent & lease", note: "Monthly lease", amount: 110000, by: "Ayesha Fernando" });
    out.push({ id: `e${id++}`, date: day(12), propertyId: null, category: "Software", note: "Channel subscriptions", amount: 4500, by: "Ayesha Fernando" });
  }
  return out.filter((e) => e.date <= iso(t)).sort((a, b) => b.date.localeCompare(a.date));
}

export const EXPENSES: Expense[] = buildExpenses();

export const EXPENSE_CATEGORIES = [
  "Staff salaries",
  "Rent & lease",
  "Electricity",
  "Water",
  "Internet",
  "Cleaning & laundry",
  "Supplies",
  "Repairs",
  "Software",
  "Other",
];

export function buildCleaning(bookings: Booking[]): CleaningTask[] {
  const t = iso(today());
  const tm = iso(addDays(today(), 1));
  return bookings
    .filter((b) => (b.checkOut === t || b.checkOut === tm) && b.status !== "cancelled" && b.status !== "enquiry")
    .map((b, i) => ({
      id: `c${i}`,
      propertyId: b.propertyId,
      date: b.checkOut,
      assignee: b.propertyId === "kandy" ? "Nimal Perera" : "Sanduni Rathnayake",
      done: false,
      note: `After ${b.guest.name.split(" ")[0]}'s check-out`,
    }));
}

export const ISSUES: Issue[] = [
  { id: "i1", propertyId: "mirissa", title: "Bedroom AC dripping water", priority: "urgent", status: "open", reported: iso(addDays(today(), -1)) },
  { id: "i2", propertyId: "kandy", title: "Hot water pressure low in shower", priority: "medium", status: "in_progress", reported: iso(addDays(today(), -4)) },
  { id: "i3", propertyId: "kandy", title: "Balcony light bulb replaced", priority: "low", status: "fixed", reported: iso(addDays(today(), -9)), cost: 1800 },
  { id: "i4", propertyId: "mirissa", title: "Wi-Fi router restarted", priority: "low", status: "fixed", reported: iso(addDays(today(), -15)), cost: 0 },
];

export const INVENTORY: InventoryItem[] = [
  { id: "v1", propertyId: "kandy", name: "Bath towels", unit: "pcs", qty: 10, low: 6 },
  { id: "v2", propertyId: "kandy", name: "Toilet rolls", unit: "rolls", qty: 4, low: 8 },
  { id: "v3", propertyId: "kandy", name: "Gas cylinder", unit: "cyl", qty: 1, low: 1 },
  { id: "v4", propertyId: "kandy", name: "Shampoo & soap kits", unit: "kits", qty: 14, low: 6 },
  { id: "v5", propertyId: "mirissa", name: "Bath towels", unit: "pcs", qty: 8, low: 6 },
  { id: "v6", propertyId: "mirissa", name: "Bed linen sets", unit: "sets", qty: 3, low: 4 },
  { id: "v7", propertyId: "mirissa", name: "Drinking water (5L)", unit: "bottles", qty: 12, low: 6 },
  { id: "v8", propertyId: "mirissa", name: "Mosquito coils", unit: "packs", qty: 2, low: 3 },
];

export const TEAM = [
  { name: "Ayesha Fernando", email: "owner@haven.test", role: "Owner", scope: "All apartments" },
  { name: "Nimal Perera", email: "staff@haven.test", role: "Staff", scope: "Hillside Residence, Kandy" },
  { name: "Sanduni Rathnayake", email: "sanduni@haven.test", role: "Staff", scope: "Ocean Loft, Mirissa" },
];
