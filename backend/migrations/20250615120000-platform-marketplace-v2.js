/**
 * Fresha-style platform extensions (no payment tables).
 * Adds super_admin role, salon verification/suspension/featured, categories, banners,
 * reviews, favorites, promo codes, richer services & staff profiles, appointment no-show.
 */

export default {
  async up(queryInterface, Sequelize) {
    const qi = queryInterface;
    const { sequelize } = qi;

    const [[userRoleUdt] = []] = await sequelize.query(
      `SELECT udt_name::text AS udt FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'role' LIMIT 1`
    );
    const userEnum = String(userRoleUdt?.udt || 'enum_users_role').replace(/[^a-zA-Z0-9_]/g, '');
    await sequelize.query(`
      DO $$ BEGIN
        EXECUTE format('ALTER TYPE %I ADD VALUE %L', '${userEnum}', 'super_admin');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    const [[apptStatusUdt] = []] = await sequelize.query(
      `SELECT udt_name::text AS udt FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'status' LIMIT 1`
    );
    const apptEnum = String(apptStatusUdt?.udt || 'enum_appointments_status').replace(/[^a-zA-Z0-9_]/g, '');
    await sequelize.query(`
      DO $$ BEGIN
        EXECUTE format('ALTER TYPE %I ADD VALUE %L', '${apptEnum}', 'no_show');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await qi.addColumn('users', 'bannedAt', { type: Sequelize.DATE, allowNull: true });
    await qi.addColumn('users', 'profilePhotoUrl', { type: Sequelize.TEXT, allowNull: true });
    await qi.addColumn('users', 'staffBio', { type: Sequelize.TEXT, allowNull: true });
    await qi.addColumn('users', 'skills', {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: Sequelize.literal(`'[]'::jsonb`),
    });
    await qi.addColumn('users', 'yearsExperience', { type: Sequelize.SMALLINT, allowNull: true });

    await qi.addColumn('marketplace_salons', 'suspendedAt', { type: Sequelize.DATE, allowNull: true });
    await qi.addColumn('marketplace_salons', 'verifiedAt', { type: Sequelize.DATE, allowNull: true });
    await qi.addColumn('marketplace_salons', 'featuredRank', { type: Sequelize.INTEGER, allowNull: true });
    await qi.addColumn('marketplace_salons', 'sponsoredRank', { type: Sequelize.INTEGER, allowNull: true });
    await qi.addColumn('marketplace_salons', 'galleryImages', {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: Sequelize.literal(`'[]'::jsonb`),
    });
    await qi.addColumn('marketplace_salons', 'videoUrls', {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: Sequelize.literal(`'[]'::jsonb`),
    });
    await qi.addColumn('marketplace_salons', 'registrationNumber', { type: Sequelize.STRING(120), allowNull: true });
    await qi.addColumn('marketplace_salons', 'taxId', { type: Sequelize.STRING(120), allowNull: true });
    await qi.addColumn('marketplace_salons', 'province', { type: Sequelize.STRING(120), allowNull: true });
    await qi.addColumn('marketplace_salons', 'district', { type: Sequelize.STRING(120), allowNull: true });

    await qi.createTable('platform_service_categories', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: { type: Sequelize.STRING(160), allowNull: false },
      slug: { type: Sequelize.STRING(180), allowNull: false, unique: true },
      iconUrl: { type: Sequelize.STRING(2048), allowNull: true },
      sortOrder: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await qi.addIndex('platform_service_categories', ['sortOrder'], { name: 'platform_service_categories_sort_idx' });

    await qi.createTable('platform_home_banners', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      title: { type: Sequelize.STRING(200), allowNull: false },
      imageUrl: { type: Sequelize.STRING(2048), allowNull: false },
      linkUrl: { type: Sequelize.STRING(2048), allowNull: true },
      isActive: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      sortOrder: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      startsAt: { type: Sequelize.DATE, allowNull: true },
      endsAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await qi.addIndex('platform_home_banners', ['isActive', 'sortOrder'], { name: 'platform_home_banners_active_sort_idx' });

    await qi.createTable('salon_reviews', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      marketplaceSalonId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'marketplace_salons', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      rating: { type: Sequelize.SMALLINT, allowNull: false },
      title: { type: Sequelize.STRING(200), allowNull: true },
      body: { type: Sequelize.TEXT, allowNull: true },
      photos: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: Sequelize.literal(`'[]'::jsonb`),
      },
      status: {
        type: Sequelize.STRING(24),
        allowNull: false,
        defaultValue: 'published',
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await qi.addIndex('salon_reviews', ['marketplaceSalonId', 'status'], { name: 'salon_reviews_salon_status_idx' });
    await qi.addIndex('salon_reviews', ['userId'], { name: 'salon_reviews_user_idx' });

    await qi.createTable('customer_favorites', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      marketplaceSalonId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'marketplace_salons', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await qi.addIndex('customer_favorites', ['userId', 'marketplaceSalonId'], {
      unique: true,
      name: 'customer_favorites_user_salon_unique',
    });

    await qi.createTable('promo_codes', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      salonId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'marketplace_salons', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      code: { type: Sequelize.STRING(64), allowNull: false },
      discountType: { type: Sequelize.STRING(16), allowNull: false },
      amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      maxUses: { type: Sequelize.INTEGER, allowNull: true },
      usesCount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      expiresAt: { type: Sequelize.DATE, allowNull: true },
      isActive: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await qi.addIndex('promo_codes', ['salonId', 'code'], {
      unique: true,
      name: 'promo_codes_salon_code_unique',
    });

    await qi.addColumn('services', 'platformCategoryId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'platform_service_categories', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    await qi.addColumn('services', 'discountPrice', { type: Sequelize.DECIMAL(10, 2), allowNull: true });
    await qi.addColumn('services', 'imageUrls', {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: Sequelize.literal(`'[]'::jsonb`),
    });
    await qi.addColumn('services', 'genderTag', { type: Sequelize.STRING(32), allowNull: true });

    await qi.addColumn('appointments', 'extraServiceIds', {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: Sequelize.literal(`'[]'::jsonb`),
    });
  },

  async down(queryInterface, Sequelize) {
    const qi = queryInterface;
    await qi.removeColumn('appointments', 'extraServiceIds');
    await qi.removeColumn('services', 'genderTag');
    await qi.removeColumn('services', 'imageUrls');
    await qi.removeColumn('services', 'discountPrice');
    await qi.removeColumn('services', 'platformCategoryId');
    await qi.dropTable('promo_codes');
    await qi.dropTable('customer_favorites');
    await qi.dropTable('salon_reviews');
    await qi.dropTable('platform_home_banners');
    await qi.dropTable('platform_service_categories');
    await qi.removeColumn('marketplace_salons', 'district');
    await qi.removeColumn('marketplace_salons', 'province');
    await qi.removeColumn('marketplace_salons', 'taxId');
    await qi.removeColumn('marketplace_salons', 'registrationNumber');
    await qi.removeColumn('marketplace_salons', 'videoUrls');
    await qi.removeColumn('marketplace_salons', 'galleryImages');
    await qi.removeColumn('marketplace_salons', 'sponsoredRank');
    await qi.removeColumn('marketplace_salons', 'featuredRank');
    await qi.removeColumn('marketplace_salons', 'verifiedAt');
    await qi.removeColumn('marketplace_salons', 'suspendedAt');
    await qi.removeColumn('users', 'yearsExperience');
    await qi.removeColumn('users', 'skills');
    await qi.removeColumn('users', 'staffBio');
    await qi.removeColumn('users', 'profilePhotoUrl');
    await qi.removeColumn('users', 'bannedAt');
    // Note: PostgreSQL cannot remove enum values easily; leave super_admin / no_show on types.
  },
};
