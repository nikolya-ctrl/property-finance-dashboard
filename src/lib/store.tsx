"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./auth";
import { setDisplayRate } from "./utils";
import {
  CHANNELS,
  EXPENSE_CATEGORIES,
  PROPERTIES,
  TEAM,
  type Booking,
  type BookingStatus,
  type CleaningTask,
  type Expense,
  type Issue,
  type InventoryItem,
} from "./data";

export type NewBookingInput = {
  propertyId: string;
  channel: string;
  checkIn: string;
  checkOut: string;
  guest: { name: string; phone: string; country: string };
  adults: number;
  children: number;
  arrival: string;
  pickup: boolean;
  currency: "LKR" | "USD";
  gross: number;
  fx: number;
  commissionPct: number;
  deposit: number; // LKR
  notes: string;
};

export type NewExpenseInput = { date: string; propertyId: string | null; category: string; note: string; amount: number };

type Store = {
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  bookings: Booking[];
  addBooking: (b: NewBookingInput) => Promise<string | null>;
  setStatus: (id: string, s: BookingStatus) => Promise<void>;
  expenses: Expense[];
  addExpense: (e: NewExpenseInput) => Promise<string | null>;
  cleaning: CleaningTask[];
  toggleCleaning: (id: string) => Promise<void>;
  issues: Issue[];
  setIssueStatus: (id: string, s: Issue["status"]) => Promise<void>;
  inventory: InventoryItem[];
  adjustStock: (id: string, delta: number) => Promise<void>;
  newBookingOpen: boolean;
  setNewBookingOpen: (v: boolean) => void;
};

const Ctx = createContext<Store | null>(null);

const replace = <T,>(target: T[], items: T[]) => target.splice(0, target.length, ...items);
const num = (v: unknown) => (v == null ? 0 : Number(v));
const toLKR = (amount: unknown, currency: string, fx: unknown) => (currency === "USD" ? num(amount) * num(fx) : num(amount));
const hhmm = (t: string | null) => (t ? t.slice(0, 5) : "");

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cleaning, setCleaning] = useState<CleaningTask[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [newBookingOpen, setNewBookingOpen] = useState(false);

  const reload = useCallback(async () => {
    const [props, chans, cats, profiles, bks, money, extras, payments, exps, clean, maint, inv, fx] = await Promise.all([
      supabase.from("properties").select("*").order("created_at"),
      supabase.from("channels").select("*").eq("active", true).order("sort_order"),
      supabase.from("expense_categories").select("*").eq("active", true).order("sort_order"),
      supabase.from("profiles").select("id, full_name, role, active"),
      supabase.from("bookings").select("*, guest:guests(*)").order("check_in"),
      // Owner-only tables: RLS returns no rows for staff, which is what we want.
      supabase.from("booking_finances").select("*"),
      supabase.from("booking_extras").select("*"),
      supabase.from("payments").select("*").eq("voided", false),
      supabase.from("expenses").select("*, category:expense_categories(name)").order("spent_on", { ascending: false }),
      supabase.from("cleaning_tasks").select("*").order("due_on"),
      supabase.from("maintenance_issues").select("*").order("reported_on", { ascending: false }),
      supabase.from("inventory_items").select("*").order("name"),
      supabase.from("exchange_rates").select("usd_lkr").order("rate_date", { ascending: false }).limit(1),
    ]);
    const failed = [props, chans, cats, profiles, bks, exps, clean, maint, inv].find((r) => r.error);
    if (failed?.error) {
      setError(failed.error.message);
      setLoading(false);
      return;
    }
    if (fx.data?.[0]) setDisplayRate(num(fx.data[0].usd_lkr));

    replace(
      PROPERTIES,
      (props.data ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        location: p.location,
        region: p.region,
        status: p.status,
        maxGuests: p.max_guests,
        baseRate: num(p.base_rate_lkr),
      }))
    );
    replace(
      CHANNELS,
      (chans.data ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        color: c.color,
        commission: num(c.default_commission_pct),
        payoutDays: c.payout_delay_days,
        isDirect: c.name.toLowerCase() === "direct",
      }))
    );
    replace(EXPENSE_CATEGORIES, (cats.data ?? []).map((c) => c.name));
    const names = new Map((profiles.data ?? []).map((p) => [p.id, p.full_name as string]));
    replace(
      TEAM,
      (profiles.data ?? []).map((p) => ({
        id: p.id,
        name: p.full_name,
        email: p.id === user?.id ? user?.email ?? "" : "",
        role: p.role === "owner" ? "Owner" : "Staff",
        scope: "All apartments",
        active: p.active,
      }))
    );

    const fin = new Map((money.data ?? []).map((f) => [f.booking_id, f]));
    const extrasBy = new Map<string, { label: string; amount: number }[]>();
    for (const e of extras.data ?? []) {
      const f = fin.get(e.booking_id);
      const list = extrasBy.get(e.booking_id) ?? [];
      list.push({ label: e.label, amount: toLKR(e.amount, e.currency, f?.fx_rate_usd_lkr ?? 300) });
      extrasBy.set(e.booking_id, list);
    }
    const paidBy = new Map<string, number>();
    for (const p of payments.data ?? []) {
      paidBy.set(p.booking_id, (paidBy.get(p.booking_id) ?? 0) + toLKR(p.amount, p.currency, p.fx_rate_usd_lkr));
    }

    setBookings(
      (bks.data ?? []).map((b) => {
        const f = fin.get(b.id);
        return {
          id: b.id,
          ref: `HT-${b.ref_no}`,
          propertyId: b.property_id,
          channel: b.channel_id,
          guestId: b.guest_id,
          guest: {
            name: b.guest?.full_name ?? "",
            country: b.guest?.country ?? "",
            flag: "",
            phone: b.guest?.phone ?? "",
            email: b.guest?.email ?? "",
          },
          adults: b.adults,
          children: b.children,
          checkIn: b.check_in,
          checkOut: b.check_out,
          arrival: hhmm(b.expected_arrival),
          pickup: b.pickup_needed,
          status: b.status,
          hasMoney: !!f,
          currency: f?.currency ?? "LKR",
          gross: num(f?.gross_amount),
          fx: num(f?.fx_rate_usd_lkr ?? 300),
          commissionPct: num(f?.commission_pct),
          extras: extrasBy.get(b.id) ?? [],
          paid: paidBy.get(b.id) ?? 0,
          payout: f?.payout_status ?? "n/a",
          notes: b.special_requests ?? undefined,
        } satisfies Booking;
      })
    );

    setExpenses(
      (exps.data ?? []).map((e) => ({
        id: e.id,
        date: e.spent_on,
        propertyId: e.property_id,
        category: e.category?.name ?? "Other",
        note: e.note,
        amount: toLKR(e.amount, e.currency, e.fx_rate_usd_lkr),
        by: names.get(e.created_by) ?? "",
        byId: e.created_by,
      }))
    );

    setCleaning(
      (clean.data ?? []).map((c) => ({
        id: c.id,
        propertyId: c.property_id,
        date: c.due_on,
        assignee: c.assigned_to ? names.get(c.assigned_to) ?? "Unassigned" : "Unassigned",
        done: c.status === "done",
        note: c.note,
      }))
    );

    setIssues(
      (maint.data ?? []).map((i) => ({
        id: i.id,
        propertyId: i.property_id,
        title: i.title,
        priority: i.priority,
        status: i.status,
        reported: i.reported_on,
        cost: i.cost_lkr == null ? undefined : num(i.cost_lkr),
      }))
    );

    setInventory(
      (inv.data ?? []).map((v) => ({
        id: v.id,
        propertyId: v.property_id,
        name: v.name,
        unit: v.unit,
        qty: num(v.quantity),
        low: num(v.low_stock_level),
      }))
    );

    setError(null);
    setLoading(false);
  }, [user?.id, user?.email]);

  useEffect(() => {
    reload();
  }, [reload]);

  const addBooking = useCallback(
    async (b: NewBookingInput): Promise<string | null> => {
      const guestId = crypto.randomUUID();
      const bookingId = crypto.randomUUID();
      // Client-generated ids: staff can insert but not read back owner-only rows.
      const g = await supabase.from("guests").insert({
        id: guestId,
        full_name: b.guest.name,
        phone: b.guest.phone || null,
        country: b.guest.country || null,
      });
      if (g.error) return g.error.message;

      const bk = await supabase.from("bookings").insert({
        id: bookingId,
        property_id: b.propertyId,
        channel_id: b.channel,
        guest_id: guestId,
        status: "confirmed",
        check_in: b.checkIn,
        check_out: b.checkOut,
        adults: b.adults,
        children: b.children,
        expected_arrival: b.arrival || null,
        pickup_needed: b.pickup,
        special_requests: b.notes || null,
      });
      if (bk.error) {
        await supabase.from("guests").delete().eq("id", guestId);
        if (bk.error.code === "23P01") return "Those dates overlap another booking for this apartment. Not saved.";
        return bk.error.message;
      }

      const isDirect = CHANNELS.find((c) => c.id === b.channel)?.isDirect;
      const f = await supabase.from("booking_finances").insert({
        booking_id: bookingId,
        currency: b.currency,
        gross_amount: b.gross,
        commission_pct: b.commissionPct,
        fx_rate_usd_lkr: b.fx,
        payout_status: isDirect ? "n/a" : "pending",
      });
      if (f.error) return `Booking saved, but the price wasn't: ${f.error.message}`;

      if (b.deposit > 0) {
        const p = await supabase.from("payments").insert({
          booking_id: bookingId,
          amount: b.deposit,
          currency: "LKR",
          method: "cash",
        });
        if (p.error) return `Booking saved, but the deposit wasn't: ${p.error.message}`;
      }
      await reload();
      return null;
    },
    [reload]
  );

  const setStatus = useCallback(
    async (id: string, s: BookingStatus) => {
      const { error } = await supabase.from("bookings").update({ status: s }).eq("id", id);
      if (error) setError(error.code === "23P01" ? "Can't confirm: those dates overlap another booking." : error.message);
      await reload();
    },
    [reload]
  );

  const addExpense = useCallback(
    async (e: NewExpenseInput): Promise<string | null> => {
      const { data: cat } = await supabase.from("expense_categories").select("id").eq("name", e.category).maybeSingle();
      if (!cat) return "Unknown category";
      const { error } = await supabase.from("expenses").insert({
        spent_on: e.date,
        property_id: e.propertyId,
        category_id: cat.id,
        amount: e.amount,
        currency: "LKR",
        note: e.note,
        created_by: user?.id,
      });
      if (error) return error.message;
      await reload();
      return null;
    },
    [reload, user?.id]
  );

  const toggleCleaning = useCallback(
    async (id: string) => {
      const task = cleaning.find((c) => c.id === id);
      if (!task) return;
      const done = !task.done;
      setCleaning((xs) => xs.map((c) => (c.id === id ? { ...c, done } : c)));
      await supabase
        .from("cleaning_tasks")
        .update({ status: done ? "done" : "todo", completed_at: done ? new Date().toISOString() : null })
        .eq("id", id);
    },
    [cleaning]
  );

  const setIssueStatus = useCallback(async (id: string, s: Issue["status"]) => {
    setIssues((xs) => xs.map((i) => (i.id === id ? { ...i, status: s } : i)));
    await supabase
      .from("maintenance_issues")
      .update({ status: s, fixed_on: s === "fixed" ? new Date().toISOString().slice(0, 10) : null })
      .eq("id", id);
  }, []);

  const adjustStock = useCallback(async (id: string, d: number) => {
    setInventory((xs) => xs.map((i) => (i.id === id ? { ...i, qty: Math.max(0, i.qty + d) } : i)));
    await supabase.from("inventory_movements").insert({ item_id: id, change: d, reason: d > 0 ? "restock" : "used" });
  }, []);

  const value = useMemo<Store>(
    () => ({
      loading,
      error,
      reload,
      bookings,
      addBooking,
      setStatus,
      expenses,
      addExpense,
      cleaning,
      toggleCleaning,
      issues,
      setIssueStatus,
      inventory,
      adjustStock,
      newBookingOpen,
      setNewBookingOpen,
    }),
    [loading, error, reload, bookings, addBooking, setStatus, expenses, addExpense, cleaning, toggleCleaning, issues, setIssueStatus, inventory, adjustStock, newBookingOpen]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
