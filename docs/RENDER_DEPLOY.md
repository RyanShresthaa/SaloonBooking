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
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS` | For real verification/password emails. **Do not** use `localhost` / `127.0.0.1` on Render (nothing listens there → `ECONNREFUSED` and failed signup). Omit these vars until you use a real provider (Gmail SMTP, SendGrid, Resend, etc.), or delete `EMAIL_HOST` if you copied a laptop `.env`. |
| `STRIPE_*`, `FEATURE_*` | See `backend/.env.example` and `Env.js` |

Save → **Manual Deploy** → **Deploy latest commit** (or push to trigger auto-deploy).

---

## 5b. Outbound email (SMTP) on Render

Render only runs your **Node API**; it does **not** include a mail server. To receive verification and password-reset emails in a real inbox, use a **transactional email provider** and put its **SMTP** settings on the Web Service.

### What to do

1. **Pick a provider** (any that offers SMTP). Common options: [Resend](https://resend.com/docs/send-with-smtp), [SendGrid](https://docs.sendgrid.com/for-developers/sending-email/getting-started-smtp), [Brevo](https://help.brevo.com/hc/en-us/articles/209467485), [Mailgun](https://documentation.mailgun.com/docs/mailgun/user-manual/sending-messages/send-via-smtp/). Create an account and complete their domain / sender verification steps so mail is allowed to leave their servers.
2. **Copy SMTP values** from the provider’s docs (host, port, username, password). Typical patterns:
   - **Port `587`:** STARTTLS (the app treats this as non-`secure` in nodemailer).
   - **Port `465`:** implicit TLS (the app sets `secure: true` when `EMAIL_PORT` is `465`).
3. In Render: open your **Web Service** (the API) → **Environment** → **Add Environment Variable** (or edit existing). Set exactly these keys (names must match what the code reads):

| Key | What to put |
|-----|----------------|
| `EMAIL_HOST` | Provider’s SMTP hostname (e.g. `smtp.resend.com`, `smtp.sendgrid.net`). **Never** `localhost` or `127.0.0.1` on Render. |
| `EMAIL_PORT` | Usually `587` or `465` (match the provider). |
| `EMAIL_USER` | SMTP username from the provider (sometimes a fixed string like `resend`, sometimes `apikey`). |
| `EMAIL_PASS` | SMTP password or API key the provider gives for SMTP. |

4. Click **Save Changes**. Trigger a **Manual Deploy** (or push a commit) so the running service picks up new variables.
5. **`CLIENT_URL`** on the same service must be your **live SPA URL** (e.g. `https://your-app.vercel.app`). Verification links in emails are built from that value.

### How to confirm

- Register a test user; you should get **`verificationEmailSent: true`** in the API response (and the register success screen should say email was sent).
- If it still fails, open **Logs** on the Web Service and look for nodemailer / SMTP errors (wrong password, unverified domain, firewall).

If you **omit** all `EMAIL_*` variables, the API can still create accounts but will **not** send mail (and may log the verify URL on the server for debugging only).

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
