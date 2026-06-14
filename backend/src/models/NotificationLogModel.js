import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const NotificationLog = sequelize.define(
    'NotificationLog',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      appointmentId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'appointments', key: 'id' },
      },
      templateId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'notification_templates', key: 'id' },
      },
      recipientEmail: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      subject: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      appointmentData: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM(
          'pending_approval',
          'queued',
          'processing',
          'sent',
          'failed',
          'declined'
        ),
        defaultValue: 'pending_approval',
      },
      errorMessage: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      jobId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      batchId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      bookingMarkedFinished: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      sentByUserId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
      },
    },
    {
      tableName: 'notification_logs',
      timestamps: true,
    }
  );

  return NotificationLog;
};
