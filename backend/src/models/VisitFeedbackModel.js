import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const VisitFeedback = sequelize.define(
    'VisitFeedback',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      appointmentId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: { model: 'appointments', key: 'id' },
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 1, max: 5 },
      },
      comment: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'visit_feedbacks',
      timestamps: true,
    }
  );

  return VisitFeedback;
};
