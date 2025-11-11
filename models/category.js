const { DataTypes } = require('sequelize');
const BaseModel = require('./basemodel');

class Category extends BaseModel {
  static fields() {
    return {
      tenantId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'tenant_id',
        references: { model: 'tenants', key: 'id' }
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      }
    };
  }

  static initModel(sequelize) {
    return super.init(this.fields(), {
      sequelize,
      tableName: 'categories',
      modelName: 'Category'
    });
  }

  static associate(models) {
    this.belongsTo(models.Tenant, {
      foreignKey: 'tenantId',
      as: 'tenant'
    });
    this.hasMany(models.Product, {
      foreignKey: 'categoryId',
      as: 'products'
    });
  }
}

module.exports = Category;
