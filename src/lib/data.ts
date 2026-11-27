/**
 * Data model shared by the screens. Reference lists (apartments, channels, categories, team)
 * are filled from Supabase by the StoreProvider on sign-in, before any screen renders.
 */
import { format, startOfDay } from "date-fns";

export type ChannelId = string; // channels.id (uuid)
export type BookingStatus = "enquiry" | "confirmed" | "checked_in" | "completed" | "cancelled" | "no_show";
export type PayoutStatus = "n/a" | "pending" | "received" | "late";

export type Property = {
  id: string;
  name: string;
  location: string;
  region: string;
  status: "operating" | "setup" | "inactive";
  maxGuests: number;
  baseRate: number; // LKR per night
};

export type Channel = { id: ChannelId; name: string; color: string; commission: number; payoutDays: number; isDirect: boolean };

export type Booking = {
  id: string;
  ref: string;
  propertyId: string;
  channel: ChannelId;
  guestId: string;
  guest: { name: string; country: string; flag: string; phone: string; email: string };
  adults: number;
  children: number;
  checkIn: string; // yyyy-MM-dd
  checkOut: string;
  arrival: string;
  pickup: boolean;
  status: BookingStatus;
  /** false for staff: money rows are owner-only in the database */
  hasMoney: boolean;
  currency: "LKR" | "USD";
  gross: number; // in booking currency
  fx: number; // LKR per USD used for this booking
  commissionPct: number;
  extras: { label: string; amount: number }[]; // LKR
  paid: number; // LKR received from guest directly
  payout: PayoutStatus;
  notes?: string;
};

export type Expense = {
  id: string;
  date: string;
  propertyId: string | null; // null = shared / General
  category: string;
  note: string;
  amount: number; // LKR
  by: string;
  byId: string | null;
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
export type TeamMember = { id: string; name: string; email: string; role: "Owner" | "Staff"; scope: string; active: boolean };

// Filled in by the store after sign-in.
export const PROPERTIES: Property[] = [];
export const CHANNELS: Channel[] = [];
export const EXPENSE_CATEGORIES: string[] = [];
export const TEAM: TeamMember[] = [];

const UNKNOWN_CHANNEL: Channel = { id: "", name: "Unknown", color: "#94A3B8", commission: 0, payoutDays: 0, isDirect: false };
const UNKNOWN_PROPERTY: Property = { id: "", name: "Unknown", location: "", region: "", status: "inactive", maxGuests: 1, baseRate: 0 };

export const channelById = (id: ChannelId) => CHANNELS.find((c) => c.id === id) ?? UNKNOWN_CHANNEL;
export const propertyById = (id: string | null) => PROPERTIES.find((p) => p.id === id) ?? UNKNOWN_PROPERTY;

export const iso = (d: Date) => format(d, "yyyy-MM-dd");
export const today = () => startOfDay(new Date());

/** Money helpers for a booking, all in LKR */
export function bookingMoney(b: Booking) {
  const grossLKR = b.currency === "USD" ? b.gross * b.fx : b.gross;
  const commission = Math.round((grossLKR * b.commissionPct) / 100);
  const extras = b.extras.reduce((s, e) => s + e.amount, 0);
  const net = grossLKR - commission + extras;
  // Platform bookings are prepaid via the platform; the guest owes us only extras.
  const owedByGuest = channelById(b.channel).isDirect ? grossLKR + extras : extras;
  const balance =
    !b.hasMoney || b.status === "cancelled" || b.status === "enquiry" || b.status === "no_show"
      ? 0
      : Math.max(0, owedByGuest - b.paid);
  return { grossLKR, commission, extras, net, balance };
}
