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
        unique: true,
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
    },
    {
      tableName: 'services',
      timestamps: true,
    }
  );

  return Service;
};
