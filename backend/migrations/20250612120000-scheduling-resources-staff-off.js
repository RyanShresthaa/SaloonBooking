import { randomUUID } from 'node:crypto';

export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('salon_resources', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      name: { type: Sequelize.STRING, allowNull: false },
      isActive: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    const mainBayId = randomUUID();
    await queryInterface.bulkInsert('salon_resources', [
      {
        id: mainBayId,
        name: 'Main bay',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    await queryInterface.addColumn('services', 'bufferBeforeMinutes', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn('services', 'bufferAfterMinutes', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn('services', 'resourceId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'salon_resources', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });
    await queryInterface.sequelize.query(
      `UPDATE services SET "resourceId" = :rid WHERE "resourceId" IS NULL`,
      { replacements: { rid: mainBayId } }
    );
    await queryInterface.changeColumn('services', 'resourceId', {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'salon_resources', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });

    await queryInterface.addColumn('appointments', 'resourceId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'salon_resources', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });
    await queryInterface.sequelize.query(`
      UPDATE appointments a
      SET "resourceId" = s."resourceId"
      FROM services s
      WHERE s.id = a."serviceId" AND a."resourceId" IS NULL
    `);
    await queryInterface.sequelize.query(
      `UPDATE appointments SET "resourceId" = :rid WHERE "resourceId" IS NULL`,
      { replacements: { rid: mainBayId } }
    );
    await queryInterface.changeColumn('appointments', 'resourceId', {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'salon_resources', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });

    await queryInterface.createTable('staff_time_offs', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      startDate: { type: Sequelize.DATEONLY, allowNull: false },
      endDate: { type: Sequelize.DATEONLY, allowNull: false },
      reason: { type: Sequelize.STRING(500), allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('staff_time_offs', ['userId', 'startDate', 'endDate']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('staff_time_offs');
    await queryInterface.removeColumn('appointments', 'resourceId');
    await queryInterface.removeColumn('services', 'resourceId');
    await queryInterface.removeColumn('services', 'bufferAfterMinutes');
    await queryInterface.removeColumn('services', 'bufferBeforeMinutes');
    await queryInterface.dropTable('salon_resources');
  },
};
