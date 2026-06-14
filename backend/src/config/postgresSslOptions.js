/**
 * Cloud Postgres (Render, Neon, RDS, …) expects TLS. Runtime Sequelize and sequelize-cli
 * must share the same SSL decision so migrations match the app.
 */

// ─── Constants ───

const SSL_ENV_DISABLED = new Set(['0', 'false', 'off']);
const SSL_ENV_ENABLED = new Set(['1', 'true', 'on']);

const POSTGRES_SSL_REQUIRE = {
  require: true,
  rejectUnauthorized: false,
};

// ─── Helpers ───

function isLikelyLocalPostgresHost(host) {
  const h = String(host || '')
    .trim()
    .toLowerCase();
  if (!h) return true;
  return h === '127.0.0.1' || h === 'localhost' || h === '::1' || h === '0.0.0.0';
}

/**
 * @returns {Record<string, unknown>} Spread into Sequelize constructor or Database.js env block.
 * - `DB_SSL=1` / `true` → force SSL
 * - `DB_SSL=0` / `false` → never SSL
 * - unset → SSL when NODE_ENV is production OR DB_HOST is not local
 */
function getPostgresDialectOptions() {
  const raw = (process.env.DB_SSL || '').trim().toLowerCase();
  if (SSL_ENV_DISABLED.has(raw)) return {};
  if (SSL_ENV_ENABLED.has(raw)) {
    return {
      dialectOptions: {
        ssl: POSTGRES_SSL_REQUIRE,
      },
    };
  }
  const nodeEnv = process.env.NODE_ENV || 'development';
  const remote = !isLikelyLocalPostgresHost(process.env.DB_HOST);
  if (nodeEnv === 'production' || remote) {
    return {
      dialectOptions: {
        ssl: POSTGRES_SSL_REQUIRE,
      },
    };
  }
  return {};
}

// ─── Exports ───

export { isLikelyLocalPostgresHost, getPostgresDialectOptions };
