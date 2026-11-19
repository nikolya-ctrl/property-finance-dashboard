import { addDays, differenceInCalendarDays, endOfMonth, format, max, min, parseISO, startOfMonth, subMonths } from "date-fns";
import { bookingMoney, PROPERTIES, type Booking, type Expense } from "./mock-data";

const counts = (b: Booking) => b.status !== "cancelled" && b.status !== "enquiry";

/** Nights of a booking that fall inside [from, to) */
export function nightsIn(b: Booking, from: Date, to: Date) {
  const s = max([parseISO(b.checkIn), from]);
  const e = min([parseISO(b.checkOut), to]);
  return Math.max(0, differenceInCalendarDays(e, s));
}

/** Revenue is counted on stay dates: each night carries its share of the booking's net. */
export function monthStats(bookings: Booking[], expenses: Expense[], month: Date, propertyId?: string) {
  const from = startOfMonth(month);
  const to = addDays(endOfMonth(month), 1);
  const props = PROPERTIES.filter((p) => p.status === "operating" && (!propertyId || p.id === propertyId));
  let gross = 0,
    commission = 0,
    extras = 0,
    net = 0,
    nights = 0,
    bookingsCount = 0;
  for (const b of bookings) {
    if (!counts(b) || (propertyId && b.propertyId !== propertyId)) continue;
    const n = nightsIn(b, from, to);
    if (!n) continue;
    const total = differenceInCalendarDays(parseISO(b.checkOut), parseISO(b.checkIn));
    const share = n / total;
    const m = bookingMoney(b);
    gross += m.grossLKR * share;
    commission += m.commission * share;
    extras += m.extras * share;
    net += m.net * share;
    nights += n;
    if (parseISO(b.checkIn) >= from && parseISO(b.checkIn) < to) bookingsCount += 1;
  }
  const exp = expenses
    .filter((e) => e.date >= format(from, "yyyy-MM-dd") && e.date < format(to, "yyyy-MM-dd"))
    .filter((e) => !propertyId || e.propertyId === propertyId)
    .reduce((s, e) => s + e.amount, 0);
  const available = differenceInCalendarDays(to, from) * props.length;
  return {
    label: format(month, "MMM"),
    month: format(month, "MMMM yyyy"),
    gross,
    commission,
    extras,
    net,
    expenses: exp,
    profit: net - exp,
    nights,
    bookings: bookingsCount,
    occupancy: available ? nights / available : 0,
    adr: nights ? (gross / nights) : 0,
    revpar: available ? gross / available : 0,
  };
}

export function lastMonths(n: number, from = new Date()) {
  return Array.from({ length: n }, (_, i) => subMonths(from, n - 1 - i));
}
