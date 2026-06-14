# Multi-salon marketplace — architecture & delivery plan

This document turns the product requirement into an engineering roadmap for evolving **Salon desk** from a **single-tenant** scheduling product (one implied salon, global `services`, `appointments`, `salon_resources`) into a **centralized marketplace**: many salons, moderated listings, public discovery, and per-salon booking.

---

## 1. Current system (baseline)

| Area | Today |
|------|--------|
| Identity | `users.role`: `admin`, `staff`, `customer` — no salon/tenant FK |
| Catalog | `services` are global; `name` is **unique** across the whole DB |
| Scheduling | `appointments`, `salon_resources` (chairs/bays), staff assignment |
| “Salon” | **SalonResource** = internal resource name (e.g. “Main bay”), **not** a business profile |

Any marketplace work must introduce a real **tenant root** (e.g. `salons` / `organizations`) and gradually scope **all** operational data to `salonId`.

---

## 2. Target domain model

### 2.1 Core tenant: `Salon` (organization)

One row per business on the platform (whether created via owner onboarding or admin).

**Suggested scalar columns (indexed for search/filter):**

- Identity: `id`, `slug` (unique, public URL), `name`, `listingStatus`
- Narrative: `description` (rich text or markdown later)
- Media: `logoUrl`, `coverImageUrl` (URLs from your upload pipeline — S3/R2/etc.)
- Location: `addressLine1`, `addressLine2`, `city`, `region`, `postalCode`, `country`, optional `latitude`, `longitude`
- Contact: `publicEmail`, `publicPhone`, `websiteUrl`
- Moderation: `adminReviewNotes`, `reviewedAt`, `reviewedByUserId`, `submittedByUserId`, `submittedAt`

**Structured JSONB (versioned in migrations, validated in API with Zod/Joi):**

- `operatingHours` — e.g. `{ "mon": { "open": "09:00", "close": "18:00", "closed": false }, ... }`
- `servicesCatalog` — snapshot for listing: `[{ "name", "description", "durationMinutes", "price" }]`
- `staffHighlights` — display-only: `[{ "name", "title", "bio", "photoUrl" }]`
- `socialLinks` — `{ "instagram", "facebook", "tiktok", "x", ... }`
- `amenities` — `string[]`

Keeping bulky, rarely-joined fields in **JSONB** avoids dozens of nullable columns while still allowing Postgres indexes (e.g. GIN on `amenities`) later if needed.

### 2.2 Listing lifecycle (`listingStatus`)

| Status | Meaning |
|--------|--------|
| `pending` | Submitted, awaiting admin |
| `approved` | Visible on public marketplace + eligible for booking (once booking is scoped by salon) |
| `rejected` | Hidden; applicant notified with reason (`adminReviewNotes`) |
| `changes_requested` | Hidden from public; applicant can edit and resubmit |

Only **`approved`** salons appear in browse/search and on public profile routes.

### 2.3 People & roles (evolution)

- **Platform admin** — existing `role === 'admin'` today; extended permissions: manage any salon, approvals, manual CRUD.
- **Salon owner** — new role or `users.salonId` + `salonRole` (`owner` | `staff`) once multi-tenant bookings exist.
- **Customer** — may book across salons; appointments must carry `salonId`.

---

## 3. Phased delivery (recommended)

### Phase A — Directory & moderation (additive, low risk)

**Goal:** Listings and admin workflow **without** yet splitting every booking query by tenant.

- DB: `marketplace_salons` (or `salons`) + status enum + JSONB payloads *(migration + model started in repo)*  
- API:  
  - `POST /api/marketplace/salons` — authenticated applicant, strict validation, creates `pending` row  
  - `GET /api/admin/marketplace/salons` — list/filter by status  
  - `PATCH /api/admin/marketplace/salons/:id` — approve / reject / request changes + notes  
- UI: multi-step onboarding form; admin “Moderation queue” + edit form  
- Public: `GET /api/public/marketplace/salons` (approved only) + `GET /api/public/marketplace/salons/:slug`  

**No change yet** to `services` uniqueness or appointment controllers.

### Phase B — Tenant isolation for operations

**Goal:** Each salon has its own services, resources, staff scope.

- Add `salonId` UUID **NOT NULL** to: `services`, `salon_resources`, `appointments`, `waitlist_entries`, `retail_products`, `notification_templates`, … (inventory every table).  
- **Backfill:** create one “legacy” salon row and set all existing rows to that `salonId`.  
- Drop or relax global `UNIQUE` on `services.name` → replace with **`UNIQUE (salonId, name)`**.  
- Middleware: resolve `salonId` from session / JWT / subdomain (decide one strategy).  
- All staff/admin queries filter by `salonId`; platform admin bypasses or uses impersonation.

### Phase C — Public marketplace UX

- Browse page: cards, pagination  
- Search: full-text on `name`, `description`, `city` (Postgres `tsvector` or trigram)  
- Filters: location, service tags (denormalize from `servicesCatalog` or normalize to join table), rating (once aggregated), price min/max  
- Salon profile: approved payload + “Book” CTA into **that salon’s** booking funnel  

### Phase D — Media, ratings, scale

- Image upload pipeline + CDN URLs  
- Aggregated ratings from `visit_feedback` once tied to `salonId`  
- Caching, SEO (`/s/:slug`), optional subdomain per salon  

---

## 4. API sketch (REST)

| Method | Route | Auth | Purpose |
|--------|--------|------|--------|
| POST | `/api/marketplace/salons` | User (future: `salon_owner`) | Submit listing |
| GET | `/api/marketplace/salons/me` | User | Applicant sees own submissions |
| GET | `/api/public/marketplace/salons` | Public | Approved directory + filters |
| GET | `/api/public/marketplace/salons/:slug` | Public | Profile |
| GET | `/api/admin/marketplace/salons` | Admin | Queue + full list |
| PATCH | `/api/admin/marketplace/salons/:id` | Admin | Approve / reject / request changes |
| POST | `/api/admin/marketplace/salons` | Admin | Manual create |
| DELETE | `/api/admin/marketplace/salons/:id` | Admin | Remove listing |

All payloads should be validated server-side; **never** trust client-only “required field” checks.

---

## 5. Frontend routes (suggested)

| Route | Audience |
|-------|----------|
| `/marketplace` | Public browse + search |
| `/marketplace/:slug` | Public salon profile |
| `/apply` or `/list-your-salon` | Onboarding wizard |
| `/admin/marketplace` | Admin queue & CRUD |

Reuse existing `AppShell`, auth guard, and design tokens for consistency.

---

## 6. Decisions to lock early

1. **URL strategy:** path-based `/marketplace/:slug` vs `/:slug` vs subdomain per salon.  
2. **Who submits:** only logged-in users vs guest application + later account link.  
3. **Booking entry:** marketplace profile → same SPA with `?salon=` vs dedicated tenant host.  
4. **Payments:** single Stripe Connect vs later phase.  

---

## 7. Repository artifact (Phase A schema)

The following migration + model introduce **`marketplace_salons`** as an **additive** table:

- `backend/migrations/20250614120000-create-marketplace-salons.js`  
- `backend/src/models/MarketplaceSalonModel.js`  
- Registered in `backend/src/models/Index.js` with optional `User` associations for submitter/reviewer.

`listingStatus` is stored as `VARCHAR(32)` with Sequelize `validate.isIn` (avoids PostgreSQL enum name mismatches with Sequelize).

**Run migration** (when your database is ready):

```bash
cd backend && npm run db:migrate
```

Controllers and UI for submissions/approvals are **not** wired yet — implement in Phase A continuation following section 4.

---

## 8. Risk & testing

- **Data migration:** Phase B touches almost every query — plan feature flags + staged rollout.  
- **Performance:** add indexes on `(listingStatus, city)`, `slug`, and later GIN as needed.  
- **Compliance:** store consent for marketing, privacy policy links on onboarding.  

This document is the single source of truth for scope until tickets are split in your tracker.
