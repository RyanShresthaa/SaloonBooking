# Public contact emails for approved marketplace salons

Salon teams use the **Notifications** bulk flow to queue customer emails; **approve / decline** (and related actions) are restricted to **salon `admin` and `staff` users** whose `users.salonId` matches the booking’s salon. **Platform `super_admin` accounts cannot** approve or decline those messages.

Listed below is how to export the **directory contact email** stored on each approved listing (`marketplace_salons.public_email`). Use these inboxes for operational contact; **sign-in accounts** that can approve notifications are normal desk users (`role` = `admin` or `staff`) linked to the same salon id as the listing (`users.salon_id` = `marketplace_salons.id`).

## SQL (PostgreSQL)

```sql
SELECT
  ms.id AS salon_id,
  ms.slug,
  ms.name,
  ms."publicEmail" AS public_email,
  ms."publicPhone" AS public_phone,
  ms.city,
  ms.region
FROM marketplace_salons ms
WHERE ms."listingStatus" = 'approved'
  AND ms."suspendedAt" IS NULL
ORDER BY ms.name;
```

Optional: list desk users per salon (who can act in the app):

```sql
SELECT
  ms.name AS salon_name,
  ms.slug,
  ms."publicEmail" AS listing_public_email,
  u.email AS desk_user_email,
  u.role,
  u.name AS desk_user_name
FROM marketplace_salons ms
LEFT JOIN users u ON u."salonId" = ms.id AND u.role IN ('admin', 'staff')
WHERE ms."listingStatus" = 'approved'
  AND ms."suspendedAt" IS NULL
ORDER BY ms.name, u.role, u.email;
```

Run from psql, pgAdmin, or any SQL client connected to your app database.
