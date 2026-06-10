export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'speciality', {
      type: Sequelize.STRING(500),
      allowNull: true,
    });
    await queryInterface.addColumn('users', 'staffNotes', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'speciality');
    await queryInterface.removeColumn('users', 'staffNotes');
  },
};
