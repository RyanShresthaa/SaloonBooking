export default {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('notification_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      appointmentId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'appointments', key: 'id' },
        onDelete: 'SET NULL',
      },
      templateId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'notification_templates', key: 'id' },
        onDelete: 'SET NULL',
      },
      recipientEmail: { type: Sequelize.STRING, allowNull: false },
      subject: { type: Sequelize.STRING, allowNull: false },
      status: {
        type: Sequelize.ENUM('queued', 'processing', 'sent', 'failed'),
        defaultValue: 'queued',
      },
      errorMessage: { type: Sequelize.TEXT, allowNull: true },
      jobId: { type: Sequelize.STRING, allowNull: true },
      batchId: { type: Sequelize.STRING, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('notification_logs');
  },
};
