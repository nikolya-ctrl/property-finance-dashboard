"use client";

import { createContext, useContext, useMemo, useState } from "react";
import {
  BOOKINGS,
  EXPENSES,
  ISSUES,
  INVENTORY,
  buildCleaning,
  type Booking,
  type BookingStatus,
  type CleaningTask,
  type Expense,
  type Issue,
  type InventoryItem,
} from "./mock-data";

/** In-memory store for the UI prototype. Everything resets on reload. */
type Store = {
  bookings: Booking[];
  addBooking: (b: Booking) => void;
  setStatus: (id: string, s: BookingStatus) => void;
  expenses: Expense[];
  addExpense: (e: Expense) => void;
  cleaning: CleaningTask[];
  toggleCleaning: (id: string) => void;
  issues: Issue[];
  setIssueStatus: (id: string, s: Issue["status"]) => void;
  inventory: InventoryItem[];
  adjustStock: (id: string, delta: number) => void;
  newBookingOpen: boolean;
  setNewBookingOpen: (v: boolean) => void;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [bookings, setBookings] = useState(BOOKINGS);
  const [expenses, setExpenses] = useState(EXPENSES);
  const [cleaning, setCleaning] = useState(() => buildCleaning(BOOKINGS));
  const [issues, setIssues] = useState(ISSUES);
  const [inventory, setInventory] = useState(INVENTORY);
  const [newBookingOpen, setNewBookingOpen] = useState(false);

  const value = useMemo<Store>(
    () => ({
      bookings,
      addBooking: (b) => setBookings((xs) => [...xs, b].sort((a, c) => a.checkIn.localeCompare(c.checkIn))),
      setStatus: (id, s) => setBookings((xs) => xs.map((b) => (b.id === id ? { ...b, status: s } : b))),
      expenses,
      addExpense: (e) => setExpenses((xs) => [e, ...xs]),
      cleaning,
      toggleCleaning: (id) => setCleaning((xs) => xs.map((c) => (c.id === id ? { ...c, done: !c.done } : c))),
      issues,
      setIssueStatus: (id, s) => setIssues((xs) => xs.map((i) => (i.id === id ? { ...i, status: s } : i))),
      inventory,
      adjustStock: (id, d) => setInventory((xs) => xs.map((i) => (i.id === id ? { ...i, qty: Math.max(0, i.qty + d) } : i))),
      newBookingOpen,
      setNewBookingOpen,
    }),
    [bookings, expenses, cleaning, issues, inventory, newBookingOpen]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
