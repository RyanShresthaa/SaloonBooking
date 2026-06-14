# Step-by-step: Salon app on **free Render** (Velvet Shear demo for others)

This guide assumes your code is on **GitHub** (or GitLab/Bitbucket Render supports).

You will create:

1. A **PostgreSQL** database (free)  
2. A **Web Service** running the **Node API** (`backend/`)  
3. A **Static Site** running the built **React app** (`frontend/`)

After this, you can log in as **Velvet Shear** with `desk.velvet@demo.salon` and share your **static site URL** + that login with anyone.

---

## Part A — PostgreSQL

1. In [Render Dashboard](https://dashboard.render.com) → **New +** → **PostgreSQL**.
2. Name it (e.g. `salon-db`), pick **Free**, region close to you, create.
3. When it’s ready, open the DB → **Connect** (or **Info**).
4. Copy these separately (you will paste them into the API service):

   - **Internal Database URL** — for the API **on Render** (recommended).  
   - Or use **Hostname**, **Port**, **Database**, **User**, **Password** fields if shown.

   The API in this repo expects **separate** variables (not a single `DATABASE_URL`):

   | Variable | Where it comes from |
   |----------|----------------------|
   | `DB_HOST` | Hostname from the URL (e.g. `dpg-xxxxx-a.oregon-postgres.render.com`) |
   | `DB_PORT` | Usually `5432` |
   | `DB_NAME` | Database name |
   | `DB_USER` | User |
   | `DB_PASSWORD` | Password (copy carefully; special characters matter) |

5. For Render’s managed Postgres, set:

   ```text
   DB_SSL=true
   ```

---

## Part B — Backend (Web Service)

1. **New +** → **Web Service** → connect your repo.
2. **Settings:**
   - **Root Directory:** `backend`  
   - **Runtime:** Node  
   - **Build Command:** `npm install`  
   - **Start Command:** `npm start`  
   - **Instance type:** Free  

3. **Environment** (Web Service → **Environment**), add:

   | Key | Value |
   |-----|--------|
   | `NODE_ENV` | `production` |
   | *(Port)* | Render sets **`PORT`** automatically. Your server uses `process.env.PORT` — do **not** force `5000` on Render. |
   | `DB_HOST` | from Postgres |
   | `DB_PORT` | `5432` |
   | `DB_NAME` | from Postgres |
   | `DB_USER` | from Postgres |
   | `DB_PASSWORD` | from Postgres |
   | `DB_SSL` | `true` |
   | `JWT_SECRET` | Long random string (generate once, keep secret) |
   | `CLIENT_URL` | Your **frontend** public URL — set this **after** Part C (e.g. `https://salon-app.onrender.com`). No trailing slash. |
   | `DEMO_SALON_OWNER_PASSWORD` | A password **you choose** for all four demo desk accounts (e.g. `MyDemo2026!`) |

   Optional (only if you need platform admin seed):

   | `ADMIN_BOOTSTRAP_EMAIL` | Your real Gmail (or similar) |
   | `ADMIN_BOOTSTRAP_PASSWORD` | Strong password |

4. **Link the database (optional but convenient):** In the Web Service, **Environment** → **Link database** → select your Postgres. Render may add `DATABASE_URL`; this project still needs the `DB_*` variables above unless you change code.

5. **Deploy** and wait until the first deploy finishes. **Free tier:** the service **sleeps**; the first request after sleep can take **~30–60 seconds**.

6. **Do not** set `AUTH_EMAIL_VERIFICATION_REQUIRED=1` unless you have also set up **Resend** (see `deploy-render-email.md`). For a free demo, leave verification **off** so `desk.velvet@demo.salon` works without a real inbox.

---

## Part C — Frontend (Static Site)

1. **New +** → **Static Site** → same repo.
2. **Settings:**
   - **Root Directory:** `frontend`  
   - **Build Command:** `npm install && npm run build`  
   - **Publish directory:** `dist`  

3. **Environment** (Static Site → **Environment**), add **before** the first successful build:

   | Key | Value |
   |-----|--------|
   | `VITE_API_URL` | `https://<YOUR-API-SERVICE-NAME>.onrender.com/api` |
   | `VITE_SOCKET_URL` | `https://<YOUR-API-SERVICE-NAME>.onrender.com` — **same host as the API, no `/api` path** (required in production; see `frontend/src/lib/socket.ts`) |

   Replace `<YOUR-API-SERVICE-NAME>` with the hostname Render gave your **Web Service** (from the API service URL).

4. Deploy the static site. Copy its URL (e.g. `https://salon-frontend.onrender.com`).

5. Go back to the **Web Service** → **Environment** → set **`CLIENT_URL`** to that **exact** static URL (`https://salon-frontend.onrender.com`). **Save** — service will redeploy. This fixes **CORS** and link generation.

---

## Part D — Database tables and demo data (one-time)

You must run migrations and seeds **against the production database**.

### Option 1 — Render Shell (easiest if available)

1. Open your **Web Service** → **Shell** (or **SSH**).  
2. Run:

   ```bash
   npm run db:migrate
   npm run db:seed:demo-salons
   npm run db:seed:demo-owners
   ```

   If `demo-owners` says salons are missing, run `demo-salons` first (order above is correct).

### Option 2 — From your laptop

1. Temporarily point local `backend/.env` at Render’s **External** DB connection (if enabled) **or** use `psql` / a GUI with SSL.  
2. Same three commands from the `backend` folder.

### Option 3 — Add a release script (advanced)

Some teams add a guarded `release` script in `package.json` and set **Render → Deploy → Release Command**. Only do this if you understand it will run on **every** release.

---

## Part E — What you share for the Velvet Shear demo

| Item | Value |
|------|--------|
| **Website** | Your static site URL, e.g. `https://salon-frontend.onrender.com` |
| **Login path** | `/login` |
| **Email** | `desk.velvet@demo.salon` |
| **Password** | The value you set in Render for `DEMO_SALON_OWNER_PASSWORD` (and re-ran `db:seed:demo-owners` after changing it) |
| **Public salon page** | `https://<static-host>/marketplace/velvet-shear-studio-kathmandu` |

After login, the app may redirect to that salon’s public page if `salonSlug` is on the user (log in again once after deploy if needed).

---

## Quick checks if something fails

| Symptom | What to verify |
|---------|----------------|
| **CORS error** | `CLIENT_URL` on the API **exactly** matches the browser origin (scheme + host, no trailing slash). |
| **401 / network** on API | `VITE_API_URL` ends with `/api` and uses **https**. |
| **Build fails: VITE_SOCKET_URL** | Set `VITE_SOCKET_URL` on the **Static Site** to `https://your-api.onrender.com` (no `/api`). Rebuild. |
| **DB connection error** | `DB_SSL=true`, password correct, use **internal** host from API on Render. |
| **404 salon** | Use slug `velvet-shear-studio-kathmandu` (see demo docs). |
| **Login fails** | Re-run `npm run db:seed:demo-owners` after setting `DEMO_SALON_OWNER_PASSWORD`; passwords are hashed at seed time. |

---

## Free tier limits (set expectations)

- Services **sleep** when idle; first load is slow.  
- Postgres free tier has **size / expiry** limits — check Render’s current docs.  
- **Outbound email** (verification, forgot password) needs **Resend** or SMTP — not included in “free demo login” unless you configure it (`deploy-render-email.md`).

---

## Related docs

- `deploy-render-email.md` — Resend / SMTP for real mail  
- `demo-marketplace-desk-logins.md` — all four demo desk emails and slugs  
