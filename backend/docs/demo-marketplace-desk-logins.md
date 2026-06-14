# Demo marketplace desk logins

These accounts are created by the seeder `20250622120500-demo-marketplace-desk-owners.js`. Run the demo salons seed first, then the desk owners:

```bash
cd backend
npm run db:seed:demo-salons
npm run db:seed:demo-owners
```

## Password

Set `DEMO_SALON_OWNER_PASSWORD` in `.env`. If you leave it unset, the seeder hashes the default **`SalonDemo1!`**. Use a strong value anywhere the database is shared.

## Accounts (email → public listing)

After login, **admin** and **staff** users with a marketplace `salonId` are redirected to `/marketplace/<slug>` when the API returns `salonSlug`.

| Salon | Login email | Marketplace path |
| --- | --- | --- |
| Velvet Shear Studio | `desk.velvet@demo.salon` | `/marketplace/velvet-shear-studio-kathmandu` |

Legacy URL `/marketplace/velvet-shear-studio-austin` is accepted and redirected to the Kathmandu slug above.
| Harbor Nail Atelier | `desk.harbor@demo.salon` | `/marketplace/harbor-nail-atelier-pokhara` |
| Rosewood Barber Collective | `desk.rosewood@demo.salon` | `/marketplace/rosewood-barber-collective` |
| Lumière Spa & Brow | `desk.lumiere@demo.salon` | `/marketplace/lumiere-spa-brow-kathmandu` |

Public contact addresses (`hello@velvetshear.demo`, etc.) are **not** sign-in accounts; they are display-only on listings.

## Edit your public listing (salon desk)

Signed-in **admin** or **staff** users with a `salonId` can update their customer-facing marketplace page (story, Nepal address lines, hours JSON, gallery URLs, amenities, team JSON, contact) at:

**`/marketplace/my-listing`**

The API is `GET` / `PATCH /api/marketplace/listing`. Slug and approval status stay under **platform super admin** control (`/admin/marketplace`).
