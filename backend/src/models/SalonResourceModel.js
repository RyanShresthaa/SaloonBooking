import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const SalonResource = sequelize.define(
    'SalonResource',
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
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      salonId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'marketplace_salons', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
    },
    {
      tableName: 'salon_resources',
      timestamps: true,
    }
  );

  return SalonResource;
};
