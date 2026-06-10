import { DataTypes } from 'sequelize';
import bcrypt from 'bcryptjs';

export default (sequelize) => {
  const User = sequelize.define(
    'User',
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
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM('admin', 'staff', 'customer'),
        defaultValue: 'customer',
      },
      isEmailVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      emailVerificationToken: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      passwordResetToken: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      clientNotes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      allergies: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      marketingEmailOptIn: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      loyaltyPoints: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      /** Shown on admin staff directory / booking (e.g. colour, extensions). */
      speciality: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      /** Internal salon notes for team members (not customer-facing). */
      staffNotes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'users',
      timestamps: true,
      hooks: {
        beforeCreate: async (user) => {
          if (user.password) {
            user.password = await bcrypt.hash(user.password, 12);
          }
        },
        beforeUpdate: async (user) => {
          if (user.changed('password')) {
            user.password = await bcrypt.hash(user.password, 12);
          }
        },
      },
    }
  );

  User.prototype.comparePassword = async function (plainPassword) {
    return bcrypt.compare(plainPassword, this.password);
  };

  return User;
};
