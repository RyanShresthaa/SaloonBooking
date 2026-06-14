import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Appointment = sequelize.define(
    'Appointment',
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
      customerName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      customerEmail: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { isEmail: true },
      },
      customerPhone: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      appointmentDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      startTime: {
        type: DataTypes.TIME,
        allowNull: false,
      },
      endTime: {
        type: DataTypes.TIME,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('pending', 'confirmed', 'cancelled', 'completed', 'no_show'),
        defaultValue: 'pending',
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      isVip: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      emailRemindersOptIn: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      assignedStaffId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
      },
      loyaltyBonusApplied: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      reminder24hSentAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      seriesId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      resourceId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'salon_resources', key: 'id' },
      },
      salonId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'marketplace_salons', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      extraServiceIds: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    },
    {
      tableName: 'appointments',
      timestamps: true,
    }
  );

  return Appointment;
};
