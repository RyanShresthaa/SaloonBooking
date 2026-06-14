import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const NotificationTemplate = sequelize.define(
    'NotificationTemplate',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      salonId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'marketplace_salons', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      subject: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      body: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      requiresVip: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      tableName: 'notification_templates',
      timestamps: true,
      indexes: [
        { unique: true, fields: ['salonId', 'name'], name: 'notification_templates_salon_id_name_unique' },
      ],
    }
  );

  return NotificationTemplate;
};
