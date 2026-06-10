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
    },
    {
      tableName: 'salon_resources',
      timestamps: true,
    }
  );

  return SalonResource;
};
