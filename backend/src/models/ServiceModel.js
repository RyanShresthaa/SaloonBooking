import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Service = sequelize.define(
    'Service',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      salonId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'marketplace_salons', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      duration: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      bufferBeforeMinutes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      bufferAfterMinutes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      resourceId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'salon_resources', key: 'id' },
      },
      platformCategoryId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'platform_service_categories', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      discountPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      imageUrls: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      genderTag: { type: DataTypes.STRING(32), allowNull: true },
    },
    {
      tableName: 'services',
      timestamps: true,
      indexes: [{ unique: true, fields: ['salonId', 'name'], name: 'services_salon_id_name_unique' }],
    }
  );

  return Service;
};
