import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define(
    'PromoCode',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      salonId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'marketplace_salons', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      code: { type: DataTypes.STRING(64), allowNull: false },
      discountType: { type: DataTypes.STRING(16), allowNull: false },
      amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      maxUses: { type: DataTypes.INTEGER, allowNull: true },
      usesCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      expiresAt: { type: DataTypes.DATE, allowNull: true },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'promo_codes', timestamps: true }
  );
