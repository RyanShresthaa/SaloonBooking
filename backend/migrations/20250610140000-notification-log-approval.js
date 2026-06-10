export default {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('notification_logs', 'appointmentData', {
      type: Sequelize.JSONB,
      allowNull: true,
    });

    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        ALTER TYPE "enum_notification_logs_status" ADD VALUE 'pending_approval';
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        ALTER TYPE "enum_notification_logs_status" ADD VALUE 'declined';
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('notification_logs', 'appointmentData');
  },
};
