export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'passwordResetToken', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'passwordResetToken');
  },
};
