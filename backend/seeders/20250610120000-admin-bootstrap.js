import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const email =
  process.env.ADMIN_BOOTSTRAP_EMAIL?.trim() || 'ryanshr02@gmail.com';
const plainPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD?.trim();

export default {
  up: async (queryInterface) => {
    if (!plainPassword) {
      console.warn(
        '[admin-bootstrap] Skipping: set ADMIN_BOOTSTRAP_PASSWORD in .env then run: npm run db:seed:admin'
      );
      return;
    }

    const password = await bcrypt.hash(plainPassword, 12);
    const now = new Date();

    const [existing] = await queryInterface.sequelize.query(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
      { bind: [email] }
    );

    if (existing.length > 0) {
      await queryInterface.sequelize.query(
        `UPDATE users
         SET password = $1,
             role = 'admin',
             "isEmailVerified" = true,
             "emailVerificationToken" = NULL,
             "updatedAt" = $2
         WHERE email = $3`,
        { bind: [password, now, email] }
      );
    } else {
      await queryInterface.bulkInsert('users', [
        {
          id: uuidv4(),
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
    const target =
      process.env.ADMIN_BOOTSTRAP_EMAIL?.trim() || 'ryanshr02@gmail.com';
    await queryInterface.bulkDelete('users', { email: target });
  },
};
