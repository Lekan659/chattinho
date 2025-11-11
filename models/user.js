// models/user.js
const { DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');
const BaseModel = require('./basemodel');

class User extends BaseModel {
  static fields() {
    return {
      tenantId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'tenants', key: 'id' }
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      role: {
        type: DataTypes.ENUM('admin', 'staff'),
        defaultValue: 'admin'
      }
    };
  }

  static initModel(sequelize) {
    const model = super.init(this.fields(), {
      sequelize,
      tableName: 'users',
      modelName: 'User',
      hooks: {
        beforeCreate: async (user) => {
          user.password = await bcrypt.hash(user.password, 10);
        },
        beforeUpdate: async (user) => {
          if (user.changed('password')) {
            user.password = await bcrypt.hash(user.password, 10);
          }
        }
      }
    });
    return model;
  }

  async validatePassword(password) {
    return bcrypt.compare(password, this.password);
  }

  static associate(models) {
    this.belongsTo(models.Tenant, { foreignKey: 'tenantId', as: 'tenant' });
  }
}

module.exports = User;
