export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('appointments', 'assignedStaffId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    await queryInterface.addColumn('appointments', 'loyaltyBonusApplied', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await queryInterface.addColumn('appointments', 'reminder24hSentAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('appointments', 'seriesId', {
      type: Sequelize.UUID,
      allowNull: true,
    });

    await queryInterface.sequelize.query(
      `UPDATE appointments SET "loyaltyBonusApplied" = true WHERE status = 'completed'`
    );

    await queryInterface.createTable('audit_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      actorUserId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      action: {
        type: Sequelize.STRING(120),
        allowNull: false,
      },
      entityType: {
        type: Sequelize.STRING(80),
        allowNull: false,
      },
      entityId: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });
    await queryInterface.addIndex('audit_logs', ['entityType', 'entityId']);
    await queryInterface.addIndex('audit_logs', ['createdAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('audit_logs');
    await queryInterface.removeColumn('appointments', 'seriesId');
    await queryInterface.removeColumn('appointments', 'reminder24hSentAt');
    await queryInterface.removeColumn('appointments', 'loyaltyBonusApplied');
    await queryInterface.removeColumn('appointments', 'assignedStaffId');
  },
};
