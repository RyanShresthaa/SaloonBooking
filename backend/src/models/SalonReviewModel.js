import { DataTypes } from 'sequelize';

export default (sequelize) =>
  sequelize.define(
    'SalonReview',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      marketplaceSalonId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'marketplace_salons', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      rating: { type: DataTypes.SMALLINT, allowNull: false },
      title: { type: DataTypes.STRING(200), allowNull: true },
      body: { type: DataTypes.TEXT, allowNull: true },
      photos: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      status: { type: DataTypes.STRING(24), allowNull: false, defaultValue: 'published' },
    },
    { tableName: 'salon_reviews', timestamps: true }
  );
