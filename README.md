# Property Finance Dashboard

A booking and finance dashboard for holiday apartments.

## What it does

Tracks bookings, money and housekeeping for our holiday apartments in Sri Lanka across Booking.com, Airbnb, Agoda and direct bookings.

## Documents

- [Requirements](docs/REQUIREMENTS.md)
- [Implementation plan](docs/IMPLEMENTATION_PLAN.md): architecture, data model, diagrams, phases
- [CRUD operations](docs/CRUD_OPERATIONS.md): every create/read/update/delete with permissions

## Run it

The app talks to the Supabase project **hiltonia-dashboard** (Mumbai). All data is saved there and protected by Row Level Security.

```bash
cp .env.example .env.local   # then fill in the project URL and publishable key
pnpm install
pnpm dev
```

Open http://localhost:3100

### Signing in

Access is **invite-only**. The first owner is already invited. On the login page, enter the invited email and click **Email me a sign-in link**, then set a password under **Settings → Account**.
Owners invite more people from **Settings → Team**. Anyone who signs up without an invite gets an account with no access.

| Role | Sees |
|---|---|
| Owner | Everything: money, reports, settings |
| Staff | Bookings, calendar, operations, own expenses. No prices, profit, reports or settings |

### Database

Migrations live in `supabase/migrations/` and are already applied to the live project.

- Double bookings are blocked by the database (check-out day is free for the next guest).
- A cleaning task is created automatically for every check-out.
- Income is counted on stay dates; shared costs show as "General".

## Project structure

```
src/       Next.js app
supabase/  database migrations
data/   sample data (never commit real tenant or bank data)
docs/   notes and design docs
```

## Getting started

Stack: Next.js + Tailwind CSS + Framer Motion (UI), with Supabase + Resend planned (see the implementation plan).
