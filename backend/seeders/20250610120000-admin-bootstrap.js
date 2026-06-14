import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

/**
 * Bootstrap the primary desk user (tenant admin, not platform super_admin).
 *
 * Env (both required to run):
 * - `ADMIN_BOOTSTRAP_EMAIL`
 * - `ADMIN_BOOTSTRAP_PASSWORD`
 *
 * Run: npm run db:seed:admin
 */

dotenv.config();

/** Primary marketplace tenant (Phase B default salon). */
const DEFAULT_SALON_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim();
const plainPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD?.trim();

export default {
  up: async (queryInterface) => {
    if (!email) {
      // eslint-disable-next-line no-console
      console.warn('[admin-bootstrap] Skipping: set ADMIN_BOOTSTRAP_EMAIL in .env then run: npm run db:seed:admin');
      return;
    }
    if (!plainPassword) {
      // eslint-disable-next-line no-console
      console.warn('[admin-bootstrap] Skipping: set ADMIN_BOOTSTRAP_PASSWORD in .env then run: npm run db:seed:admin');
      return;
    }

    const password = await bcrypt.hash(plainPassword, 12);
    const now = new Date();

    const [existing] = await queryInterface.sequelize.query(`SELECT id FROM users WHERE email = $1 LIMIT 1`, {
      bind: [email],
    });

    if (existing.length > 0) {
      await queryInterface.sequelize.query(
        `UPDATE users
         SET password = $1,
             role = 'admin',
             "isEmailVerified" = true,
             "emailVerificationToken" = NULL,
             "salonId" = $4,
             "updatedAt" = $2
         WHERE email = $3`,
        { bind: [password, now, email, DEFAULT_SALON_ID] }
      );
    } else {
      await queryInterface.bulkInsert('users', [
        {
          id: uuidv4(),
          salonId: DEFAULT_SALON_ID,
          name: 'Salon Admin',
          email,
          password,
          role: 'admin',
          isEmailVerified: true,
          emailVerificationToken: null,
          createdAt: now,
          updatedAt: now,
        },
      ]);
    }
  },

  down: async (queryInterface) => {
    const target = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim();
    if (!target) return;
    await queryInterface.bulkDelete('users', { email: target });
  },
};
