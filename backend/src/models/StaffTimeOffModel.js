import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const StaffTimeOff = sequelize.define(
    'StaffTimeOff',
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
      startDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      endDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      reason: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
    },
    {
      tableName: 'staff_time_offs',
      timestamps: true,
    }
  );

  return StaffTimeOff;
};
