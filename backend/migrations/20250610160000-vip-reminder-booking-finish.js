export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('appointments', 'isVip', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await queryInterface.addColumn('notification_templates', 'requiresVip', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await queryInterface.addColumn('notification_logs', 'bookingMarkedFinished', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await queryInterface.sequelize.query(`
      UPDATE notification_templates
      SET "requiresVip" = true
      WHERE name = 'VIP Confirmation';
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('notification_logs', 'bookingMarkedFinished');
    await queryInterface.removeColumn('notification_templates', 'requiresVip');
    await queryInterface.removeColumn('appointments', 'isVip');
  },
};
