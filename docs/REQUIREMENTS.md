# Requirements – Holiday Apartment Booking & Finance Dashboard

_Collected 2026-11-19 from the owner Q&A._

## Business context

- 5 holiday apartments in Sri Lanka (Kandy, down south, Nuwara Eliya, …). **2 operating now**, the other 3 come online later — the app must make adding a property easy.
- Each apartment is rented as a **whole unit** (one booking at a time).
- Bookings come from **Booking.com, Airbnb, Agoda, direct (WhatsApp/phone/walk-in)**, plus any other channel (e.g. TripAdvisor) — channels must be a configurable list, not hard-coded.
- All profit belongs to the business (no owner/partner split).

## Data entry

- **Manual entry for v1** (quick booking form, phone-friendly).
- Design so automated imports can be added later: CSV/payout report upload, iCal calendar sync, or a channel manager.

## Bookings

For each booking store:
- Apartment, channel, platform booking reference, status (confirmed / cancelled / no-show / completed)
- Check-in and check-out dates, nights (calculated)
- **Guests:** name, phone, email, country, adults/children, expected arrival time, special requests/notes, pickup needed, passport/ID number (sensitive – restricted access), plus custom extra fields
- **Money:**
  - Gross amount in the currency paid (LKR or USD) and the LKR/USD exchange rate used
  - Platform commission (amount or %), net earnings
  - Deposit/advance paid, balance due, payment status
  - Extras (airport pickup, tours, breakfast, extra guest, …)
  - Payout: expected date, received date, amount received
- **Double-booking protection:** block saving and show a warning if dates overlap another active booking for the same apartment.

## Expenses

Per apartment (or shared/general), with date, category, amount, currency, note, receipt photo.
Categories (editable): cleaning & laundry, staff salaries, electricity, water, internet, gas, rent/lease, repairs & maintenance, furniture & supplies, toiletries, platform/subscription fees, other.

## Currency

Show **LKR and USD** side by side. Store the original amount and currency plus the rate used.

## Dashboard (home screen)

1. **Upcoming check-ins and check-outs** (today, tomorrow, next 7 days) – main focus
2. Bookings needing attention: unpaid balances, overdue payouts
3. This month's figures: income, expenses, profit, occupancy – per apartment and in total
4. Calendar showing bookings across all apartments
5. Today's cleaning tasks

## Reports

- **Monthly profit and loss** per apartment and for all apartments together
- **Platform comparison:** number of bookings, income, commission paid, average nightly rate per channel
- **Occupancy and ADR (average daily rate)**, per apartment, month and season

## Operations

- **Cleaning tasks:** created automatically after each check-out, assigned to a staff member, marked done.
- **Maintenance log:** issue, apartment, reported date, cost, fixed date.
- **Inventory:** linen, toiletries, gas, etc. per apartment, with low-stock warnings.

## Users and access

- **Owners:** see and do everything.
- **Staff:** can see upcoming bookings and check-ins, add bookings and expenses, and manage cleaning, maintenance and inventory. They **cannot** see profit, reports or passport/ID data.
- Must work equally well on **phone and laptop**.

## Reminders (email via Resend)

- Check-in reminder (e.g. the day before arrival)
- Unpaid balance reminder
- Missing/late payout reminder

## Tech stack

- **Next.js** (web app, mobile-friendly)
- **Supabase** (Postgres database, login, row-level security for owner/staff roles, file storage for receipts)
- **Resend** for email reminders (scheduled job)
- Hosting: Vercel (free tier to start)

## Out of scope for v1

- Automatic syncing with the booking platforms (planned for later)
- Tax/accountant export (wasn't selected – can be added later)
