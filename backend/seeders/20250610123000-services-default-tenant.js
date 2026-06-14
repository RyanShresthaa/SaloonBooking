import { v4 as uuidv4 } from 'uuid';

/** Default tenant UUID (must match marketplace / Phase B migrations). */
const DEFAULT_SALON_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

/** Mid-market Kathmandu-style menu (NPR). Kept in sync with 20250624140000-reprice-nepal-market.js */
const SERVICE_ROWS = [
  {
    name: 'Haircut',
    description: 'Classic haircut and styling',
    duration: 30,
    price: 1200,
  },
  {
    name: 'Manicure',
    description: 'Full manicure with nail polish',
    duration: 45,
    price: 1650,
  },
  {
    name: 'Spa Treatment',
    description: 'Full body relaxation spa',
    duration: 90,
    price: 5500,
  },
  {
    name: 'Massage',
    description: 'Deep tissue massage',
    duration: 60,
    price: 4200,
  },
  {
    name: 'Pedicure',
    description: 'Full pedicure with nail care',
    duration: 45,
    price: 1900,
  },
];

export default {
  up: async (queryInterface) => {
    const [alreadySeeded] = await queryInterface.sequelize.query(
      `SELECT 1 FROM services WHERE "salonId" = $1::uuid AND name = 'Haircut' LIMIT 1`,
      { bind: [DEFAULT_SALON_ID] }
    );
    if (alreadySeeded.length > 0) {
      return;
    }

    const [existingResources] = await queryInterface.sequelize.query(
      `SELECT id FROM salon_resources WHERE "isActive" = true AND "salonId" = $1 ORDER BY "createdAt" ASC LIMIT 1`,
      { bind: [DEFAULT_SALON_ID] }
    );
    let resourceId = existingResources[0]?.id;
    if (!resourceId) {
      resourceId = uuidv4();
      await queryInterface.bulkInsert('salon_resources', [
        {
          id: resourceId,
          salonId: DEFAULT_SALON_ID,
          name: 'Main bay',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
    }

    const now = new Date();
    const rows = SERVICE_ROWS.map((svc) => ({
      id: uuidv4(),
      salonId: DEFAULT_SALON_ID,
      name: svc.name,
      description: svc.description,
      duration: svc.duration,
      price: svc.price,
      isActive: true,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      resourceId,
      createdAt: now,
      updatedAt: now,
    }));

    await queryInterface.bulkInsert('services', rows);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('services', null, {});
  },
};
