# Deployment and operations

This document complements the Salon app codebase with production-minded practices.

## Database backups

- **Postgres**: schedule nightly `pg_dump` (or your host’s automated backups) and retain at least 7 daily + 4 weekly copies.
- **Restore drill**: periodically restore a dump to a staging database to verify backups are usable.
- **Secrets**: keep `.env` / connection strings out of git; use your platform’s secret store in production.

## Monitoring and alerts

- **HTTP**: the API logs each request after the response is sent (`RequestLogMiddleware`). Responses slower than `SLOW_REQUEST_MS` (default `1200`) are logged at **warn** level.
- **Errors**: Winston writes to `logs/error.log` and `logs/combined.log` relative to the backend process cwd — ship these files or forward them to your log aggregator.
- **Email / queue**: if you use Bull + Redis for notifications, monitor Redis connectivity and failed jobs; alert when the queue depth stays high or jobs fail repeatedly.

## Migrations

After pulling new code, run:

```bash
cd backend && npm run db:migrate
```

New columns such as `emailRemindersOptIn` on `appointments` and `sentByUserId` on `notification_logs` require this step. The migration `20250610230000-salon-extras-dashboard-crm.js` adds user CRM/consent/loyalty fields, `waitlist_entries`, `visit_feedbacks`, and `retail_products`.

**Scheduling v1:** `20250612120000-scheduling-resources-staff-off.js` adds `salon_resources`, per-service buffers and `resourceId`, `appointments.resourceId`, and `staff_time_offs`. See `docs/NEXT_FEATURES.md` for behaviour.

**Staff profile fields:** `20250613140000-user-speciality-staff-notes.js` adds optional `speciality` and `staffNotes` on `users` (admin staff form and appointment stylist picker).

## Admin staff (directory, demo accounts, hours)

- **Who sees it:** signed-in users with role **admin** — in the app, open **More → Staff** (`/staff`).
- **What it shows:** everyone with role `staff` or `admin`, plus **default desk hours** (09:00–18:00 with a 12:00–14:00 break — the same window the booking slot logic uses; not yet editable per stylist).
- **Demo stylists:** optional **Add demo stylists** creates four fixed demo users (`*@salon-desk.demo`) if missing.
- **Add team member / edit / delete:** form and per-row actions on `/staff`. `POST/PATCH/DELETE /api/staff/team` (see `NEXT_FEATURES.md` for delete safeguards).
- In **production**, set **`STAFF_SEED_PASSWORD`** for the sandbox button if you use it; dev may use the built-in default (see `Env.js`). New team members from the form do not use `STAFF_SEED_PASSWORD`.
- **Time off:** admins can add and remove rows in `staff_time_offs` from the same page (API under `/api/staff/time-off`).

## Automated checks

- **Backend**: `cd backend && npm test` — smoke tests for `/health`, unauthenticated protected routes, and related JSON endpoints (see `backend/tests/http.test.js`).
- **Frontend E2E**: start the UI (`cd frontend && npm run dev`), then in another shell run `cd frontend && npm run e2e`. Set `PLAYWRIGHT_BASE_URL` if your dev server uses a different host or port.

## Security reminders

- Enforce HTTPS in production, rotate JWT secrets, and keep rate limits enabled.
- Customers are scoped to their own appointments in `AppointmentService`; keep verifying `req.user` on every mutating route when you add features.

## Bulk Notify / Socket.IO (426 Upgrade Required)

If the browser reports **426 Upgrade Required** on the notifications page, it is usually the **Socket.IO** Engine.IO **long-polling** request conflicting with a proxy or HTTP/2 edge. The client defaults to **WebSocket-first**; ensure `VITE_SOCKET_URL` is the **Node server origin only** (no `/api` suffix). See `frontend/.env.example`. If your network only allows polling, set `VITE_SOCKET_POLLING_FIRST=true`.
