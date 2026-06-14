import { DataTypes } from 'sequelize';

/**
 * Directory / onboarding record for a salon on the marketplace.
 * Operational booking data (appointments, services) remains on legacy tables
 * until multi-tenant Phase B adds salonId across the stack.
 */
export default (sequelize) => {
  const MarketplaceSalon = sequelize.define(
    'MarketplaceSalon',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      /** URL-safe identifier; set when listing is approved or reserved earlier. */
      slug: {
        type: DataTypes.STRING(160),
        allowNull: true,
        unique: true,
      },
      name: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      logoUrl: { type: DataTypes.STRING(2048), allowNull: true },
      coverImageUrl: { type: DataTypes.STRING(2048), allowNull: true },
      addressLine1: { type: DataTypes.STRING(255), allowNull: false },
      addressLine2: { type: DataTypes.STRING(255), allowNull: true },
      city: { type: DataTypes.STRING(120), allowNull: false },
      region: { type: DataTypes.STRING(120), allowNull: true },
      postalCode: { type: DataTypes.STRING(32), allowNull: true },
      country: { type: DataTypes.STRING(2), allowNull: false, defaultValue: 'US' },
      latitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
      longitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
      publicPhone: { type: DataTypes.STRING(40), allowNull: true },
      publicEmail: { type: DataTypes.STRING(255), allowNull: true },
      websiteUrl: { type: DataTypes.STRING(2048), allowNull: true },
      operatingHours: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      servicesCatalog: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      staffHighlights: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      socialLinks: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      amenities: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      submittedByUserId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      listingStatus: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: 'pending',
        validate: {
          isIn: [['pending', 'approved', 'rejected', 'changes_requested']],
        },
      },
      adminReviewNotes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      reviewedByUserId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      reviewedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      suspendedAt: { type: DataTypes.DATE, allowNull: true },
      verifiedAt: { type: DataTypes.DATE, allowNull: true },
      featuredRank: { type: DataTypes.INTEGER, allowNull: true },
      sponsoredRank: { type: DataTypes.INTEGER, allowNull: true },
      galleryImages: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      videoUrls: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      registrationNumber: { type: DataTypes.STRING(120), allowNull: true },
      taxId: { type: DataTypes.STRING(120), allowNull: true },
      province: { type: DataTypes.STRING(120), allowNull: true },
      district: { type: DataTypes.STRING(120), allowNull: true },
    },
    {
      tableName: 'marketplace_salons',
      timestamps: true,
      indexes: [
        { fields: ['listingStatus'] },
        { fields: ['city', 'region'] },
        { fields: ['slug'] },
      ],
    }
  );

  return MarketplaceSalon;
};
