import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define(
    'PlatformHomeBanner',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      title: { type: DataTypes.STRING(200), allowNull: false },
      imageUrl: { type: DataTypes.STRING(2048), allowNull: false },
      linkUrl: { type: DataTypes.STRING(2048), allowNull: true },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      startsAt: { type: DataTypes.DATE, allowNull: true },
      endsAt: { type: DataTypes.DATE, allowNull: true },
    },
    { tableName: 'platform_home_banners', timestamps: true }
  );
