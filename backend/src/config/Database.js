import dotenv from 'dotenv';
import { getPostgresDialectOptions } from './postgresSslOptions.js';

dotenv.config();

// ─── Constants ───

const DIALECT = 'postgres';
const LOGGING = false;

// ─── Exports ───

const sslBlock = getPostgresDialectOptions();

const baseConnection = {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  dialect: DIALECT,
  logging: LOGGING,
  ...sslBlock,
};

export default {
  development: {
    ...baseConnection,
    database: process.env.DB_NAME,
  },
  test: {
    ...baseConnection,
    database: `${process.env.DB_NAME}_test`,
  },
  production: {
    ...baseConnection,
    database: process.env.DB_NAME,
  },
};
