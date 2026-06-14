# Email on Render (outbound + “usable” addresses)

There are **two different things**: (1) **your API sending mail** (verification, password reset, notifications), and (2) **addresses shown on salon listings** (`publicEmail`, `hello@…demo`, etc.) **receiving** mail.

---

## 1. Make the *app* send email (required for verification / resets)

Render blocks or throttles many consumer SMTP paths. Prefer **Resend** (HTTPS) or a transactional SMTP provider (SendGrid, Mailgun, Postmark, Amazon SES).

### Option A — Resend (recommended on Render)

1. Create [Resend](https://resend.com) account and an API key.
2. **Verify a domain** you own (DNS records Resend gives you). Until then you can only send *from* Resend’s test sender (limited recipients).
3. In the **Render Web Service** (backend), set:

| Variable | Example |
|----------|---------|
| `RESEND_API_KEY` | `re_…` |
| `EMAIL_FROM` | `Salon desk <noreply@yourdomain.com>` (must be allowed in Resend for that domain) |
| `MAIL_PROVIDER` | `resend` or leave unset for **`auto`** (uses Resend when `RESEND_API_KEY` is set) |

4. Set `CLIENT_URL` to your **production frontend URL** (single origin, or comma-separated if you have several). Links in emails use this.

5. If you require signup verification:

| Variable | Value |
|----------|--------|
| `AUTH_EMAIL_VERIFICATION_REQUIRED` | `1` |

If outbound mail is **not** configured, the auth layer still logs debug links in server logs when verification is on (see `AuthService`); that is only for debugging, not end users.

### Option B — SMTP (transactional provider)

Set:

- `MAIL_PROVIDER=smtp`
- `EMAIL_HOST`, `EMAIL_PORT` (often `587`), `EMAIL_USER`, `EMAIL_PASS`
- `EMAIL_FROM` if your transport needs it (check `emailHelper.js` for how `from` is set for SMTP).

Avoid Gmail SMTP from Render for production — it often **times out** or is rate-limited from cloud IPs. Use a provider meant for transactional email.

### Database SSL on Render

Use Render’s Postgres connection string and enable SSL as your project already documents (`DB_SSL` / dialect options).

---

## 2. “Usable” salon listing emails (`publicEmail`, `hello@velvetshear.demo`, …)

These values are **marketing / contact fields** on `marketplace_salons`. They are **not** magic inboxes:

- **`@demo` / `@demo.salon` addresses** are placeholders for local/demo. **No one receives mail there** unless you buy/configure a real domain and point MX records to a mailbox provider.
- To make them **actually receive** mail in production:
  1. Use a domain you control (e.g. `yourbrand.com` or each salon’s real domain).
  2. Create real mailboxes or **aliases** (Google Workspace, Zoho, Microsoft 365, **Cloudflare Email Routing** to a Gmail inbox, etc.).
  3. Set **`publicEmail`** (and desk owner logins if you want) to those real addresses — via **Edit public listing** (`/marketplace/my-listing`) or admin / DB.

Same idea for **bootstrap admin** (`ADMIN_BOOTSTRAP_EMAIL`): it must be an address **you can read** if you rely on “forgot password” or verification email to that account.

---

## 3. Demo desk logins (`desk.*@demo.salon`)

These are **login identifiers** in your database, not hosted mailboxes. They do not receive email unless you:

- Use a domain you own for `@demo.salon` (or change seeds to `@yourdomain.com`) **and** configure receiving, or  
- Change seeded emails to addresses you already use (re-seed or `UPDATE users`).

For production, prefer real salon owner emails and strong unique passwords; keep demo seeds only on staging.

---

## 4. Quick Render checklist

- [ ] `RESEND_API_KEY` + `EMAIL_FROM` (or full `EMAIL_*` SMTP)  
- [ ] `CLIENT_URL=https://your-frontend.onrender.com` (or Vercel URL)  
- [ ] `JWT_SECRET` strong and unique  
- [ ] `NODE_ENV=production`  
- [ ] If `AUTH_EMAIL_VERIFICATION_REQUIRED=1`, confirm a test registration receives mail  
- [ ] Replace listing `publicEmail` / contact fields with **real** inboxes or forwarders  
- [ ] CORS: ensure `CLIENT_URL` / origins match where the SPA is served  

See `src/config/Env.js` and `src/utils/emailHelper.js` for all mail-related env vars.
