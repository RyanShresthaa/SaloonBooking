# Post-deploy roadmap implementation

This document tracks **v1 slices** of the larger product roadmap that are implemented in this repo, in **dependency order**.

## 1. Smart scheduling (buffers + shared resources)

- **Salon resources** (`salon_resources`): physical bays / rooms. Each **service** belongs to one resource (`services.resourceId`).
- **Buffers** per service: `bufferBeforeMinutes`, `bufferAfterMinutes` (e.g. cleanup after colour).
- **Double-booking** is prevented for the **same resource on the same day**, across **all services** that share that resource (not only same `serviceId`).
- **Appointments** store `resourceId` (copied from the service at booking time for consistency).

**Admin:** set buffers and `resourceId` when creating/updating services (API; add more rows in `salon_resources` via SQL or future admin UI).

**Run migration:** `npm run db:migrate` in `Backend` (adds tables/columns).

## 2. Staff availability (time off)

- **`staff_time_offs`**: date range per staff user. While active, that stylist cannot be assigned and **public slot filtering** with `staffId` returns no slots for those days.
- **API (admin only):** `GET/POST/DELETE /api/staff/time-off/...`

## 3. Staff-aware slot picker

- **`GET /api/appointments/available-slots?...&staffId=`** (authenticated): respects resource conflicts **and** stylist conflicts + time off.
- **`GET /api/appointments/staff`**: any signed-in user can list stylists (for “preferred stylist” when booking).

## 4. Public booking widget API (no login)

- **`GET /api/public/services`** — active services (limited fields).
- **`GET /api/public/available-slots`** — same slot engine as above; optional `staffId`.
- Rate-limited (`120` requests / 15 min / IP on `/api/public`).
- Disable with **`FEATURE_PUBLIC_BOOKING=0`**.

Frontend helpers: `src/lib/api/public.ts` for embedding in an iframe or external site.

## 5. Stripe deposit checkout

- **`POST /api/billing/deposit-checkout`** (authenticated): body `{ "appointmentId": "<uuid>" }` — must own the booking.
- Returns **`{ url, sessionId }`** for Stripe Checkout (fixed amount from **`STRIPE_DEPOSIT_AMOUNT_CENTS`**).
- Requires **`STRIPE_SECRET_KEY`**; disable with **`FEATURE_STRIPE_DEPOSITS=0`**.
- **Webhook / marking paid in DB** is not implemented yet — confirm payment in Stripe Dashboard or add a webhook next.

Frontend: `src/lib/api/billing.ts`.

## 6. Admin staff directory (`/staff`)

- **Admin UI** (More → Staff): **Add team member** (name, email, password, role staff/admin, optional speciality & internal notes), **default desk hours**, **sandbox “Add demo stylists”** (four fixed demo accounts), **time off** CRUD, and directory list.
- **API:** `GET /api/staff/team`, `POST /api/staff/team` (create), `PATCH /api/staff/team/:id` (update), `DELETE /api/staff/team/:id` (remove; blocks last admin, self-delete, and users with customer appointments/waitlist rows), `POST /api/staff/team/seed-demo` (demo seed). Time off: **`/api/staff/time-off`**.
- **Migration:** `20250613140000-user-speciality-staff-notes.js` adds optional `users.speciality` and `users.staffNotes`.

---

### Suggested next steps (not done here)

- Webhook to record `depositPaidAt` on appointments.
- Admin UI for resources, buffers, and staff time off.
- Full rota / recurring cadence beyond current `seriesId` repeat.
- WhatsApp, Google Reserve, analytics dashboards, AI features — separate projects.
