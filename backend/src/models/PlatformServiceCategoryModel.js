import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define(
    'PlatformServiceCategory',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      name: { type: DataTypes.STRING(160), allowNull: false },
      slug: { type: DataTypes.STRING(180), allowNull: false, unique: true },
      iconUrl: { type: DataTypes.STRING(2048), allowNull: true },
      sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    { tableName: 'platform_service_categories', timestamps: true }
  );
