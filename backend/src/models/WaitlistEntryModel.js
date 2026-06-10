import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const WaitlistEntry = sequelize.define(
    'WaitlistEntry',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      serviceId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'services', key: 'id' },
      },
      preferredDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('pending', 'contacted', 'fulfilled', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
      },
    },
    {
      tableName: 'waitlist_entries',
      timestamps: true,
    }
  );

  return WaitlistEntry;
};
