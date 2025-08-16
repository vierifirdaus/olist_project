import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/sequelize';

interface UserAttrs {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt?: Date;
  updatedAt?: Date;
}
type UserCreate = Optional<UserAttrs, 'id' | 'createdAt' | 'updatedAt'>;

class User extends Model<UserAttrs, UserCreate> implements UserAttrs {
  public id!: string;
  public email!: string;
  public name!: string;
  public passwordHash!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

User.init(
  {
    id: {
      type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(160), allowNull: false, unique: true,
      validate: { isEmail: true }
    },
    name: { type: DataTypes.STRING(120), allowNull: false },
    passwordHash: { type: DataTypes.STRING, allowNull: false },
  },
  {
    sequelize,
    tableName: 'users',
    indexes: [{ unique: true, fields: ['email'] }]
  }
);

export default User;
