import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const AuditLog = sequelize.define(
    'AuditLog',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      actorUserId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
      },
      action: {
        type: DataTypes.STRING(120),
        allowNull: false,
      },
      entityType: {
        type: DataTypes.STRING(80),
        allowNull: false,
      },
      entityId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
    },
    {
      tableName: 'audit_logs',
      updatedAt: false,
      timestamps: true,
      createdAt: 'createdAt',
    }
  );

  return AuditLog;
};
