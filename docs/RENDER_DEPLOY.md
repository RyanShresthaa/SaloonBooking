# Deploy the API on Render

This guide deploys the **Node/Express backend** (`backend/`) so your **Vercel** SPA can call a real `https://…` URL instead of `localhost`.

Overview: **PostgreSQL** + **Redis** (for Bull) + **Web Service** (your API).

---

## 1. Prerequisites

- GitHub repo pushed (e.g. `SaloonBooking`).
- Render account: [render.com](https://render.com) → sign up with GitHub.

---

## 2. Create PostgreSQL

1. Render Dashboard → **New +** → **PostgreSQL**.
2. Pick a name, region, instance type (Free tier is OK to try; production often needs paid).
3. After it is **Available**, open the database → **Connections**.
4. Note **Hostname**, **Port**, **Database**, **User**, **Password** (you will map these to `DB_*` below).

Optional: use **Internal Database URL** only for services in the same Render account (recommended). For migrations from your laptop, you may use the **External** URL temporarily or use **Render Shell** on the Web Service (step 7).

---

## 3. Create Redis (required for queues / notifications)

Bull uses Redis.

1. **New +** → **Redis** (or **Valkey** if Redis is unavailable in your region).
2. Create the instance; copy the **Redis URL** (often `rediss://…`). You will set **`REDIS_URL`** on the Web Service to this value.

If you only see host/port/password fields, set `REDIS_HOST`, `REDIS_PORT`, and use `REDIS_URL` if the dashboard provides a single URL string (preferred for ioredis).

---

## 4. Create the Web Service (API)

1. **New +** → **Web Service** → connect the **same GitHub repo** as the app.
2. **Settings:**
   - **Name:** e.g. `saloon-api`
   - **Region:** same as Postgres/Redis when possible
   - **Branch:** `v1` (or your default branch)
   - **Root Directory:** `backend`  
     (Important: monorepo — Render must run commands inside `backend/`.)
   - **Runtime:** Node
   - **Build Command:** `npm install`  
     (Or leave default if Render auto-detects install.)
   - **Start Command:** `npm start`  
     (Runs `node server.js`. Render injects **`PORT`** — your app already uses `process.env.PORT`.)
3. **Instance type:** Free works for smoke tests; production APIs often need at least a starter paid instance for uptime and Socket.IO.

---

## 5. Environment variables (Web Service → **Environment**)

Add these (values from your Postgres/Redis dashboards and secrets you generate):

| Key | Example / notes |
|-----|------------------|
| `NODE_ENV` | `production` |
| `DB_HOST` | Postgres hostname from Render |
| `DB_PORT` | Usually `5432` |
| `DB_NAME` | Database name |
| `DB_USER` | User |
| `DB_PASSWORD` | Password |
| `JWT_SECRET` | Long random string (generate locally: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |
| `REDIS_URL` | Full internal Redis URL from Render |
| `CLIENT_URL` | Your **live** SPA origin, e.g. `https://saloon-booking-virid.vercel.app` (comma-separate if you have more domains) |
| `STAFF_SEED_PASSWORD` | Min 6 characters (required in production for demo-staff seed button) |

**Optional** (enable when you need them):

| Key | Notes |
|-----|--------|
| `MAIL_PROVIDER` | `resend` = only Resend API (requires `RESEND_API_KEY`). `auto` = Resend if key set, else SMTP. `smtp` = only `EMAIL_*` (ignores Resend key). |
| `RESEND_API_KEY`, `EMAIL_FROM` | **Recommended on Render** — HTTPS email (avoids Gmail SMTP `ETIMEDOUT`). See §5b. |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS` | Classic SMTP (omit if using Resend API). **Never** `localhost` on Render. |
| `STRIPE_*`, `FEATURE_*` | See `backend/.env.example` and `Env.js` |

Save → **Manual Deploy** → **Deploy latest commit** (or push to trigger auto-deploy).

---

## 5b. Outbound email on Render

Render only runs your **Node API**; it does **not** include a mail server. You need a **transactional email provider**.

### Option A — Resend HTTP API (recommended on Render)

**Gmail SMTP from Render often fails with `ETIMEDOUT`** (Google blocks or drops many cloud datacenter SMTP connections). This app supports **Resend’s HTTPS API** (port 443), which usually works reliably from Render.

1. Sign up at [resend.com](https://resend.com), create an **API key**.
2. **Verify a domain** (or use Resend’s onboarding rules for testing) so you can send `from` that domain.
3. On your Render Web Service → **Environment**, add:

| Key | Example / notes |
|-----|------------------|
| `MAIL_PROVIDER` | Set to `resend` so the API **never** uses SMTP (only Resend). Use `auto` if you want “Resend when `RESEND_API_KEY` is set, else SMTP”. |
| `RESEND_API_KEY` | `re_…` from Resend dashboard |
| `EMAIL_FROM` | After domain verify: `Salon <noreply@yourdomain.com>` (must match a verified sender in Resend) |

4. Save → redeploy. With `MAIL_PROVIDER=resend` (or `auto` while the key is set), **`EMAIL_*` SMTP is not used** for sending.

### Option B — SMTP (any provider)

If you prefer classic SMTP (SendGrid, Mailgun, Resend SMTP, etc.):

1. **Pick a provider** that documents SMTP for cloud servers. [SendGrid SMTP](https://docs.sendgrid.com/for-developers/sending-email/getting-started-smtp), [Resend SMTP](https://resend.com/docs/send-with-smtp), [Brevo](https://help.brevo.com/hc/en-us/articles/209467485), [Mailgun](https://documentation.mailgun.com/docs/mailgun/user-manual/sending-messages/send-via-smtp/).
2. **Copy SMTP values** (host, port, username, password). Typical patterns:
   - **Port `587`:** STARTTLS.
   - **Port `465`:** implicit TLS (`secure: true` in the app).
3. In Render → Web Service → **Environment**:

| Key | What to put |
|-----|----------------|
| `EMAIL_HOST` | Provider SMTP hostname. **Never** `localhost` / `127.0.0.1`. |
| `EMAIL_PORT` | Usually `587` or `465`. |
| `EMAIL_USER` | SMTP username. |
| `EMAIL_PASS` | SMTP password / API key. |

4. Save → redeploy.
5. **`CLIENT_URL`** must be your live SPA URL (verification links use it).

### How to confirm

- Register a test user; the API should return **`verificationEmailQueued: true`** when mail is scheduled (Resend or SMTP).
- Check **Render → Logs** for `Email sent via Resend` or `Email sent to …` / errors.

If you omit both **Resend** and **SMTP**, accounts can still be created but no mail is sent (logs include a **redacted** debug link only).

---

## 6. Health check (recommended)

In the Web Service **Settings**:

- **Health Check Path:** `/health`  
  (Your app exposes `GET /health` at the **root**, not under `/api`.)

---

## 7. Run database migrations (first time)

The API expects migrated tables on **the same Postgres Render uses**. If you skip this, logs will show errors like `relation "appointments" does not exist`.

**Render Web Service → Shell** (only if your plan includes Shell — otherwise use **7b**):

```bash
NODE_ENV=production npm run db:migrate
```

**Why `NODE_ENV=production`?** Sequelize uses the `production` entry in `Database.js` (SSL for Render Postgres). A plain local `npm run db:migrate` often uses `development` and a **different** database — so Render’s DB stays empty.

### 7b. Migrations from your laptop (no Render Shell)

1. Put the same **`DB_*`** values as Render into **`backend/.env`** (use the **external** hostname so your PC can reach Postgres).
2. **PowerShell:**

```powershell
cd backend
$env:NODE_ENV = "production"
npm run db:migrate
```

Confirm the log says **`Using environment "production"`**. When finished, open a **new** terminal for normal `npm run dev`, or run `Remove-Item Env:NODE_ENV`.

**If you see `The server does not support SSL connections`:** your `DB_HOST` is almost certainly still **localhost** / **127.0.0.1** (local Postgres). Copy **`DB_HOST`** (and matching `DB_*`) from Render’s Postgres **External** connection — hostname should look like `dpg-xxxxx-a.REGION.postgres.render.com`, not `localhost`. Do **not** set `DB_SSL=0` for Render; SSL should stay on for cloud Postgres.

**macOS / Linux terminal:**

```bash
cd backend
NODE_ENV=production npm run db:migrate
```

**Optional — admin user** (if you use the seeder):

```bash
npm run db:seed:admin
```

(Requires `ADMIN_BOOTSTRAP_EMAIL` / `ADMIN_BOOTSTRAP_PASSWORD` in env — see `backend/.env.example`.)

---

## 8. Copy your public API URL

After a successful deploy, Render shows a URL like:

`https://saloon-api.onrender.com`

**Smoke test in a browser:**

- `https://YOUR-SERVICE.onrender.com/health` → JSON `success: true`

---

## 9. Point Vercel at Render

In **Vercel** → Project → **Environment Variables** (Production):

| Name | Value |
|------|--------|
| `VITE_API_URL` | `https://YOUR-SERVICE.onrender.com/api` |
| `VITE_SOCKET_URL` | `https://YOUR-SERVICE.onrender.com` |

Redeploy the frontend so Vite embeds these values.

---

## 10. Common issues

| Symptom | Fix |
|---------|-----|
| `relation "public.notification_logs" does not exist` during first `db:migrate` | Older migration filenames sorted **before** base `create-*` tables (fixed in repo by renaming base migrations to `2025060900000x-*`). Pull latest, then migrate again. If a previous run left a bad state, use a fresh DB or clear `SequelizeMeta` / tables in Postgres (Render **Connect** with `psql` or dashboard SQL). |
| Build fails with only `npm` usage / help text | **Build Command** must be `npm install` (not bare `npm`). |

| Build fails on `npm install` | Confirm **Root Directory** is `backend`. |
| Service sleeps (free tier) | First request after idle can take ~30–60s; upgrade or accept cold starts. |
| DB connection SSL errors | `Database.js` already sets `ssl` for `production`; ensure `NODE_ENV=production`. |
| CORS errors from Vercel | Set `CLIENT_URL` on Render to your exact Vercel URL (`https://…`). |
| Redis / Bull errors | Ensure `REDIS_URL` is set and Redis is in the same region / reachable. |
| Register / resend returns **201** / **200** but no email; logs show **ETIMEDOUT**, **ECONNRESET**, or **connection timeout** | SMTP host/port unreachable from Render (wrong `EMAIL_HOST`, corporate firewall, or try **`EMAIL_PORT=465`** vs `587` per provider docs). Confirm credentials; check provider status. Registration still succeeds — use **Resend verification** after mail works, or copy verify URL from logs. |


## Related

- Full variable list: `/.env.example` and `backend/.env.example`
- Vercel env / localhost pitfalls: `docs/DEPLOYMENT.md` (Vercel section)
