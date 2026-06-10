export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('appointments', 'emailRemindersOptIn', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });
    await queryInterface.addColumn('notification_logs', 'sentByUserId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('notification_logs', 'sentByUserId');
    await queryInterface.removeColumn('appointments', 'emailRemindersOptIn');
  },
};
