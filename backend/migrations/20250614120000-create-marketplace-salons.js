/** Additive marketplace directory table — does not alter existing booking tables. */

export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('marketplace_salons', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      slug: {
        type: Sequelize.STRING(160),
        allowNull: true,
        unique: true,
      },
      name: { type: Sequelize.STRING(200), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: false },
      logoUrl: { type: Sequelize.STRING(2048), allowNull: true },
      coverImageUrl: { type: Sequelize.STRING(2048), allowNull: true },
      addressLine1: { type: Sequelize.STRING(255), allowNull: false },
      addressLine2: { type: Sequelize.STRING(255), allowNull: true },
      city: { type: Sequelize.STRING(120), allowNull: false },
      region: { type: Sequelize.STRING(120), allowNull: true },
      postalCode: { type: Sequelize.STRING(32), allowNull: true },
      country: { type: Sequelize.STRING(2), allowNull: false, defaultValue: 'US' },
      latitude: { type: Sequelize.DECIMAL(10, 7), allowNull: true },
      longitude: { type: Sequelize.DECIMAL(10, 7), allowNull: true },
      publicPhone: { type: Sequelize.STRING(40), allowNull: true },
      publicEmail: { type: Sequelize.STRING(255), allowNull: true },
      websiteUrl: { type: Sequelize.STRING(2048), allowNull: true },
      operatingHours: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      servicesCatalog: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      staffHighlights: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      socialLinks: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      amenities: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      submittedByUserId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      listingStatus: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: 'pending',
      },
      adminReviewNotes: { type: Sequelize.TEXT, allowNull: true },
      reviewedByUserId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      reviewedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('marketplace_salons', ['listingStatus'], {
      name: 'marketplace_salons_listing_status_idx',
    });
    await queryInterface.addIndex('marketplace_salons', ['city', 'region'], {
      name: 'marketplace_salons_city_region_idx',
    });
    await queryInterface.addIndex('marketplace_salons', ['slug'], {
      name: 'marketplace_salons_slug_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('marketplace_salons');
  },
};
