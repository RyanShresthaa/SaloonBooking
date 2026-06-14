/**
 * One-time data patch: set service, retail, and marketplace catalog prices to NPR-style
 * tiers (Nepal market). Safe to run multiple times (idempotent updates).
 *
 * Run: npm run db:seed:reprice-nepal
 */

const DEFAULT_SALON_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

const DEMO = {
  velvet: 'c0ffee01-0000-4000-8000-000000000001',
  harbor: 'c0ffee01-0000-4000-8000-000000000002',
  rosewood: 'c0ffee01-0000-4000-8000-000000000003',
  lumiere: 'c0ffee01-0000-4000-8000-000000000004',
};

/** Primary tenant — mid-market Kathmandu-style menu */
const PRIMARY_SERVICES = [
  ['Haircut', 1200],
  ['Manicure', 1650],
  ['Spa Treatment', 5500],
  ['Massage', 4200],
  ['Pedicure', 1900],
];

/** Fancy editorial hair — premium */
const VELVET = [
  ['Signature cut & style', 4200],
  ['Gloss refresh', 8900],
  ['Silk blowout', 3100],
];

/** Mid nail studio */
const HARBOR = [
  ['Gel manicure', 2200],
  ['Spa pedicure', 2950],
  ['Builder fill', 2600],
];

/** Affordable neighbourhood barber */
const ROSEWOOD = [
  ['Classic cut', 450],
  ['Skin fade', 650],
  ['Beard sculpt', 350],
];

/** Luxury spa & brow */
const LUMIERE = [
  ['Brow lamination', 6500],
  ['Custom facial', 12500],
  ['Lash lift & tint', 9800],
];

const CATALOG_JSON = {
  [DEMO.velvet]: JSON.stringify([
    { name: 'Signature cut & style', price: 4200 },
    { name: 'Gloss refresh', price: 8900 },
    { name: 'Silk blowout', price: 3100 },
  ]),
  [DEMO.harbor]: JSON.stringify([
    { name: 'Gel manicure', price: 2200 },
    { name: 'Spa pedicure', price: 2950 },
    { name: 'Builder fill', price: 2600 },
  ]),
  [DEMO.rosewood]: JSON.stringify([
    { name: 'Classic cut', price: 450 },
    { name: 'Skin fade', price: 650 },
    { name: 'Beard sculpt', price: 350 },
  ]),
  [DEMO.lumiere]: JSON.stringify([
    { name: 'Brow lamination', price: 6500 },
    { name: 'Custom facial', price: 12500 },
    { name: 'Lash lift & tint', price: 9800 },
  ]),
};

const RETAIL_NAMES = [
  'Nourishing Shampoo',
  'Hydrating Conditioner',
  'Gentle Foaming Face Wash',
  'Heat Protectant Spray',
  'Volumizing Dry Shampoo',
  'Curl Defining Cream',
  'Argan Hair Oil',
  'Scalp Scrub Treatment',
  'Sea Salt Body Wash',
  'Vitamin C Brightening Serum',
  'Lip Balm Trio',
  'Matte Styling Paste',
];

/** Base NPR retail (mid counter); multiplied per salon tier */
const RETAIL_BASE_NPR = [980, 980, 720, 850, 650, 820, 1100, 1350, 580, 1850, 380, 750];

const RETAIL_MULT = {
  [DEFAULT_SALON_ID]: 1,
  [DEMO.velvet]: 1.75,
  [DEMO.harbor]: 1.2,
  [DEMO.rosewood]: 0.62,
  [DEMO.lumiere]: 2.05,
};

function roundNpr(n) {
  return Math.round(n / 10) * 10;
}

export default {
  up: async (queryInterface) => {
    const qi = queryInterface.sequelize;

    for (const [name, price] of PRIMARY_SERVICES) {
      // eslint-disable-next-line no-await-in-loop
      await qi.query(`UPDATE services SET price = $1 WHERE "salonId" = $2::uuid AND name = $3`, {
        bind: [price, DEFAULT_SALON_ID, name],
      });
    }

    const patchSalon = async (salonId, pairs) => {
      for (const [name, price] of pairs) {
        // eslint-disable-next-line no-await-in-loop
        await qi.query(`UPDATE services SET price = $1 WHERE "salonId" = $2::uuid AND name = $3`, {
          bind: [price, salonId, name],
        });
      }
    };

    await patchSalon(DEMO.velvet, VELVET);
    await patchSalon(DEMO.harbor, HARBOR);
    await patchSalon(DEMO.rosewood, ROSEWOOD);
    await patchSalon(DEMO.lumiere, LUMIERE);

    for (const [sid, json] of Object.entries(CATALOG_JSON)) {
      // eslint-disable-next-line no-await-in-loop
      await qi.query(`UPDATE marketplace_salons SET "servicesCatalog" = $1::jsonb WHERE id = $2::uuid`, {
        bind: [json, sid],
      });
    }

    for (const salonId of Object.keys(RETAIL_MULT)) {
      const mult = RETAIL_MULT[salonId];
      for (let i = 0; i < RETAIL_NAMES.length; i += 1) {
        const name = RETAIL_NAMES[i];
        const price = roundNpr(RETAIL_BASE_NPR[i] * mult);
        // eslint-disable-next-line no-await-in-loop
        await qi.query(
          `UPDATE retail_products SET price = $1 WHERE "salonId" = $2::uuid AND name = $3 AND description LIKE '[demo retail]%'`,
          { bind: [price, salonId, name] }
        );
      }
    }
  },

  down: async () => {
    // eslint-disable-next-line no-console
    console.warn('[reprice-nepal-market] down not supported — restore from backup if needed.');
  },
};
