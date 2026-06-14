import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

/**
 * One verified `admin` user per demo marketplace salon (see 20250622120000-demo-four-marketplace-salons.js).
 * Lets you sign in and land on that salon's public listing (slug is returned at login — see AuthService).
 *
 * Password: `DEMO_SALON_OWNER_PASSWORD` in `.env`, or default `SalonDemo1!` when unset (local/demo only).
 *
 * Requires demo salons to exist first:
 *   npm run db:seed:demo-salons
 * Then:
 *   npm run db:seed:demo-owners
 * Undo:
 *   npm run db:seed:undo:demo-owners
 */

dotenv.config();

const PLAIN_PASSWORD = process.env.DEMO_SALON_OWNER_PASSWORD?.trim() || 'SalonDemo1!';

const OWNERS = [
  {
    id: 'c0ffee01-0000-4000-8000-000000020001',
    salonId: 'c0ffee01-0000-4000-8000-000000000001',
    email: 'desk.velvet@demo.salon',
    name: 'Velvet Shear (demo desk)',
  },
  {
    id: 'c0ffee01-0000-4000-8000-000000020002',
    salonId: 'c0ffee01-0000-4000-8000-000000000002',
    email: 'desk.harbor@demo.salon',
    name: 'Harbor Nail (demo desk)',
  },
  {
    id: 'c0ffee01-0000-4000-8000-000000020003',
    salonId: 'c0ffee01-0000-4000-8000-000000000003',
    email: 'desk.rosewood@demo.salon',
    name: 'Rosewood Barber (demo desk)',
  },
  {
    id: 'c0ffee01-0000-4000-8000-000000020004',
    salonId: 'c0ffee01-0000-4000-8000-000000000004',
    email: 'desk.lumiere@demo.salon',
    name: 'Lumière Spa (demo desk)',
  },
];

export default {
  up: async (queryInterface) => {
    const password = await bcrypt.hash(PLAIN_PASSWORD, 12);
    const now = new Date();

    for (const row of OWNERS) {
      const [[salon] = []] = await queryInterface.sequelize.query(
        `SELECT id FROM marketplace_salons WHERE id = $1 LIMIT 1`,
        { bind: [row.salonId] }
      );
      if (!salon) {
        // eslint-disable-next-line no-console
        console.warn(
          `[demo-marketplace-desk-owners] Skipping ${row.email}: marketplace salon ${row.salonId} not found. Run: npm run db:seed:demo-salons`
        );
        continue;
      }

      const [existing] = await queryInterface.sequelize.query(
        `SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
        { bind: [row.email] }
      );

      if (existing.length > 0) {
        await queryInterface.sequelize.query(
          `UPDATE users
           SET password = $1,
               role = 'admin',
               "isEmailVerified" = true,
               "emailVerificationToken" = NULL,
               "salonId" = $2,
               name = $3,
               "updatedAt" = $4
           WHERE LOWER(email) = LOWER($5)`,
          { bind: [password, row.salonId, row.name, now, row.email] }
        );
      } else {
        await queryInterface.bulkInsert('users', [
          {
            id: row.id,
            salonId: row.salonId,
            name: row.name,
            email: row.email,
            password,
            role: 'admin',
            isEmailVerified: true,
            emailVerificationToken: null,
            createdAt: now,
            updatedAt: now,
          },
        ]);
      }
    }
  },

  down: async (queryInterface) => {
    for (const { email } of OWNERS) {
      await queryInterface.sequelize.query(`DELETE FROM users WHERE LOWER(email) = LOWER($1)`, { bind: [email] });
    }
  },
};
