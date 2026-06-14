import { v4 as uuidv4 } from 'uuid';

const ROWS = [
  ['Hair & styling', 'hair', 10],
  ['Color', 'color', 20],
  ['Nails', 'nails', 30],
  ['Facial & skin', 'facial', 40],
  ['Massage & spa', 'massage', 50],
  ['Barber & grooming', 'barber', 60],
  ['Makeup', 'makeup', 70],
  ['Wellness', 'wellness', 80],
];

export default {
  async up(queryInterface) {
    const now = new Date();
    const [existing] = await queryInterface.sequelize.query(
      `SELECT id FROM platform_service_categories LIMIT 1`
    );
    if (existing.length > 0) return;
    await queryInterface.bulkInsert(
      'platform_service_categories',
      ROWS.map(([name, slug, sortOrder]) => ({
        id: uuidv4(),
        name,
        slug,
        iconUrl: null,
        sortOrder,
        createdAt: now,
        updatedAt: now,
      }))
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('platform_service_categories', null, {});
  },
};
