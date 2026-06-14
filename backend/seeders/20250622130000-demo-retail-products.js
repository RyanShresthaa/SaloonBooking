import { v4 as uuidv4 } from 'uuid';

/**
 * Demo retail SKUs (shampoo, face wash, styling, body care, etc.) for the primary tenant
 * and the four demo marketplace salons from 20250622120000-demo-four-marketplace-salons.js.
 *
 * Prices: NPR base (mid counter) × tier multiplier per salon — aligned with
 * 20250624140000-reprice-nepal-market.js.
 *
 * Rows are tagged with description prefix "[demo retail]" for undo.
 *
 * Run: npm run db:seed:demo-retail
 * Undo: npm run db:seed:undo:demo-retail
 */

const DEFAULT_SALON_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

const DEMO_SALON_IDS = [
  'c0ffee01-0000-4000-8000-000000000001',
  'c0ffee01-0000-4000-8000-000000000002',
  'c0ffee01-0000-4000-8000-000000000003',
  'c0ffee01-0000-4000-8000-000000000004',
];

const TAG = '[demo retail]';

/** Base NPR per product row (same order as PRODUCT_TEMPLATES) */
const RETAIL_BASE_NPR = [980, 980, 720, 850, 650, 820, 1100, 1350, 580, 1850, 380, 750];

const RETAIL_MULT = {
  [DEFAULT_SALON_ID]: 1,
  [DEMO_SALON_IDS[0]]: 1.75, // Velvet — premium
  [DEMO_SALON_IDS[1]]: 1.2, // Harbor — mid
  [DEMO_SALON_IDS[2]]: 0.62, // Rosewood — affordable
  [DEMO_SALON_IDS[3]]: 2.05, // Lumière — luxury
};

function roundNpr(n) {
  return Math.round(n / 10) * 10;
}

const PRODUCT_TEMPLATES = [
  {
    name: 'Nourishing Shampoo',
    blurb: 'Sulfate-free cleanse for color-treated hair.',
    stockQty: 22,
  },
  {
    name: 'Hydrating Conditioner',
    blurb: 'Silicone-light slip, rinse-clean finish.',
    stockQty: 20,
  },
  {
    name: 'Gentle Foaming Face Wash',
    blurb: 'pH-balanced daily cleanser for normal to oily skin.',
    stockQty: 34,
  },
  {
    name: 'Heat Protectant Spray',
    blurb: 'Up to 450°F / 232°C before blow-dry or iron.',
    stockQty: 14,
  },
  {
    name: 'Volumizing Dry Shampoo',
    blurb: 'Absorbs oil without chalky residue.',
    stockQty: 26,
  },
  {
    name: 'Curl Defining Cream',
    blurb: 'Soft hold, humidity resistance.',
    stockQty: 12,
  },
  {
    name: 'Argan Hair Oil',
    blurb: 'Ends and mid-lengths — a few drops go far.',
    stockQty: 18,
  },
  {
    name: 'Scalp Scrub Treatment',
    blurb: 'Weekly exfoliation; follow with conditioner.',
    stockQty: 9,
  },
  {
    name: 'Sea Salt Body Wash',
    blurb: 'Large bottle for shower retail.',
    stockQty: 28,
  },
  {
    name: 'Vitamin C Brightening Serum',
    blurb: 'AM use under SPF; patch test first.',
    stockQty: 11,
  },
  {
    name: 'Lip Balm Trio',
    blurb: 'Unscented, mint, and berry — impulse counter.',
    stockQty: 42,
  },
  {
    name: 'Matte Styling Paste',
    blurb: 'Reworkable hold; shampoo soluble.',
    stockQty: 16,
  },
];

async function productExists(queryInterface, salonId, name) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT 1 FROM retail_products WHERE "salonId" = $1::uuid AND name = $2 LIMIT 1`,
    { bind: [salonId, name] }
  );
  return rows.length > 0;
}

export default {
  up: async (queryInterface) => {
    const qi = queryInterface.sequelize;
    const now = new Date();
    const salonIds = [DEFAULT_SALON_ID, ...DEMO_SALON_IDS];

    for (const salonId of salonIds) {
      // eslint-disable-next-line no-await-in-loop
      const [salonRows] = await qi.query(
        `SELECT EXISTS(SELECT 1 FROM marketplace_salons WHERE id = $1::uuid) AS "exists"`,
        { bind: [salonId] }
      );
      if (!salonRows[0]?.exists) {
        // eslint-disable-next-line no-continue
        continue;
      }

      const mult = RETAIL_MULT[salonId] ?? 1;

      for (let i = 0; i < PRODUCT_TEMPLATES.length; i += 1) {
        const p = PRODUCT_TEMPLATES[i];
        // eslint-disable-next-line no-await-in-loop
        if (await productExists(queryInterface, salonId, p.name)) {
          // eslint-disable-next-line no-continue
          continue;
        }
        const id = uuidv4();
        const description = `${TAG} ${p.blurb}`;
        const price = roundNpr(RETAIL_BASE_NPR[i] * mult);
        // eslint-disable-next-line no-await-in-loop
        await qi.query(
          `
          INSERT INTO retail_products (id, name, description, price, "stockQty", "isActive", "salonId", "createdAt", "updatedAt")
          VALUES ($1::uuid, $2, $3, $4, $5, true, $6::uuid, $7::timestamptz, $8::timestamptz)
          `,
          {
            bind: [id, p.name, description, price, p.stockQty, salonId, now, now],
          }
        );
      }
    }
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`DELETE FROM retail_products WHERE description LIKE $1`, {
      bind: [`${TAG}%`],
    });
  },
};
