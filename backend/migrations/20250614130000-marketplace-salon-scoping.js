/**
 * Multi-tenant Phase B: `marketplace_salons` is the salon root.
 * Backfills a legacy "Primary salon" row and attaches all existing operational data.
 */

const LEGACY_SALON_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

export default {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    const [rows] = await queryInterface.sequelize.query(
      `SELECT id FROM marketplace_salons WHERE id = :id LIMIT 1`,
      { replacements: { id: LEGACY_SALON_ID } }
    );
    if (!rows.length) {
      // Raw SQL: Sequelize bulkInsert often rejects plain `{}` / `[]` for JSONB ("Invalid value {}").
      await queryInterface.sequelize.query(
        `
        INSERT INTO "marketplace_salons" (
          "id","slug","name","description","addressLine1","addressLine2","city","region","postalCode","country",
          "latitude","longitude","publicPhone","publicEmail","websiteUrl",
          "operatingHours","servicesCatalog","staffHighlights","socialLinks","amenities",
          "submittedByUserId","listingStatus","adminReviewNotes","reviewedByUserId","reviewedAt","createdAt","updatedAt"
        ) VALUES (
          :id,'primary','Primary salon',:desc,'—',NULL,'—',NULL,NULL,'US',
          NULL,NULL,NULL,NULL,NULL,
          '{}'::jsonb,'[]'::jsonb,'[]'::jsonb,'{}'::jsonb,'[]'::jsonb,
          NULL,'approved',NULL,NULL,NULL,:now,:now
        )
        ON CONFLICT ("id") DO NOTHING
        `,
        {
          replacements: {
            id: LEGACY_SALON_ID,
            desc: 'Default tenant for this installation. Approve additional salons from the admin marketplace.',
            now,
          },
        }
      );
    }

    await queryInterface.addColumn('users', 'salonId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'marketplace_salons', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    await queryInterface.sequelize.query(
      `UPDATE users SET "salonId" = :sid WHERE role IN ('admin', 'staff')`,
      { replacements: { sid: LEGACY_SALON_ID } }
    );

    await queryInterface.addColumn('salon_resources', 'salonId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'marketplace_salons', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });
    await queryInterface.sequelize.query(
      `UPDATE salon_resources SET "salonId" = :sid WHERE "salonId" IS NULL`,
      { replacements: { sid: LEGACY_SALON_ID } }
    );
    await queryInterface.changeColumn('salon_resources', 'salonId', {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'marketplace_salons', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });

    await queryInterface.sequelize.query(
      `ALTER TABLE services DROP CONSTRAINT IF EXISTS services_name_key`
    );
    await queryInterface.sequelize.query(
      `DROP INDEX IF EXISTS services_name_key`
    );

    await queryInterface.addColumn('services', 'salonId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'marketplace_salons', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });
    await queryInterface.sequelize.query(
      `UPDATE services SET "salonId" = :sid WHERE "salonId" IS NULL`,
      { replacements: { sid: LEGACY_SALON_ID } }
    );
    await queryInterface.changeColumn('services', 'salonId', {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'marketplace_salons', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });
    await queryInterface.addIndex('services', ['salonId', 'name'], {
      unique: true,
      name: 'services_salon_id_name_unique',
    });

    await queryInterface.addColumn('appointments', 'salonId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'marketplace_salons', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });
    await queryInterface.sequelize.query(`
      UPDATE appointments a
      SET "salonId" = s."salonId"
      FROM services s
      WHERE s.id = a."serviceId" AND a."salonId" IS NULL
    `);
    await queryInterface.changeColumn('appointments', 'salonId', {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'marketplace_salons', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });

    await queryInterface.addColumn('waitlist_entries', 'salonId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'marketplace_salons', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });
    await queryInterface.sequelize.query(`
      UPDATE waitlist_entries w
      SET "salonId" = s."salonId"
      FROM services s
      WHERE s.id = w."serviceId" AND w."salonId" IS NULL
    `);
    await queryInterface.changeColumn('waitlist_entries', 'salonId', {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'marketplace_salons', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });

    await queryInterface.addColumn('retail_products', 'salonId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'marketplace_salons', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });
    await queryInterface.sequelize.query(
      `UPDATE retail_products SET "salonId" = :sid WHERE "salonId" IS NULL`,
      { replacements: { sid: LEGACY_SALON_ID } }
    );
    await queryInterface.changeColumn('retail_products', 'salonId', {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'marketplace_salons', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });

    await queryInterface.sequelize.query(
      `ALTER TABLE notification_templates DROP CONSTRAINT IF EXISTS notification_templates_name_key`
    );
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS notification_templates_name_key`);

    await queryInterface.addColumn('notification_templates', 'salonId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'marketplace_salons', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });
    await queryInterface.sequelize.query(
      `UPDATE notification_templates SET "salonId" = :sid WHERE "salonId" IS NULL`,
      { replacements: { sid: LEGACY_SALON_ID } }
    );
    await queryInterface.changeColumn('notification_templates', 'salonId', {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'marketplace_salons', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });
    await queryInterface.addIndex('notification_templates', ['salonId', 'name'], {
      unique: true,
      name: 'notification_templates_salon_id_name_unique',
    });

    await queryInterface.addColumn('staff_time_offs', 'salonId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'marketplace_salons', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });
    await queryInterface.sequelize.query(`
      UPDATE staff_time_offs t
      SET "salonId" = u."salonId"
      FROM users u
      WHERE u.id = t."userId" AND t."salonId" IS NULL
    `);
    await queryInterface.sequelize.query(
      `UPDATE staff_time_offs SET "salonId" = :sid WHERE "salonId" IS NULL`,
      { replacements: { sid: LEGACY_SALON_ID } }
    );
    await queryInterface.changeColumn('staff_time_offs', 'salonId', {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'marketplace_salons', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('staff_time_offs', 'salonId');
    await queryInterface.removeIndex('notification_templates', 'notification_templates_salon_id_name_unique');
    await queryInterface.removeColumn('notification_templates', 'salonId');
    await queryInterface.addIndex('notification_templates', ['name'], { unique: true, name: 'notification_templates_name_key' });
    await queryInterface.removeColumn('retail_products', 'salonId');
    await queryInterface.removeColumn('waitlist_entries', 'salonId');
    await queryInterface.removeColumn('appointments', 'salonId');
    await queryInterface.removeIndex('services', 'services_salon_id_name_unique');
    await queryInterface.removeColumn('services', 'salonId');
    await queryInterface.addIndex('services', ['name'], { unique: true, name: 'services_name_key' });
    await queryInterface.removeColumn('salon_resources', 'salonId');
    await queryInterface.removeColumn('users', 'salonId');
    await queryInterface.sequelize.query(
      `DELETE FROM marketplace_salons WHERE id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'`
    );
  },
};
