# Property Finance Dashboard

A booking and finance dashboard for holiday apartments.

## What it does

Tracks bookings, money and housekeeping for our holiday apartments in Sri Lanka across Booking.com, Airbnb, Agoda and direct bookings.

## Documents

- [Requirements](docs/REQUIREMENTS.md)
- [Implementation plan](docs/IMPLEMENTATION_PLAN.md): architecture, data model, diagrams, phases
- [CRUD operations](docs/CRUD_OPERATIONS.md): every create/read/update/delete with permissions

## Run the UI prototype

The app in `src/` is a **UI-only prototype**: there's no database, all data is made-up demo data, and changes reset when you reload.

```bash
pnpm install
pnpm dev
```

Open http://localhost:3100

### Demo logins

| Role | Email | Password | Sees |
|---|---|---|---|
| Owner | `owner@haven.test` | `owner123` | Everything: money, reports, settings |
| Staff | `staff@haven.test` | `staff123` | Bookings, calendar, operations, own expenses. No profit, reports or settings |

These are hard-coded test accounts for the prototype only (`src/lib/auth.tsx`). They'll be replaced by Supabase Auth.

### Screens

Today · Calendar · Bookings (with New booking form and double-booking check) · Guests · Expenses · Operations (cleaning, maintenance, inventory) · Reports · Settings

## Project structure

```
src/    Next.js app (UI prototype)
data/   sample data (never commit real tenant or bank data)
docs/   notes and design docs
```

## Getting started

Stack: Next.js + Tailwind CSS + Framer Motion (UI), with Supabase + Resend planned (see the implementation plan).
