const { DataTypes } = require('sequelize');
const BaseModel = require('./basemodel');

class Product extends BaseModel {
  static fields() {
    return {
      tenantId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'tenant_id',
        references: { model: 'tenants', key: 'id' }
      },
      categoryId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'category_id',
        references: { model: 'categories', key: 'id' }
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false
      },
      stock: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      available: { // ADDED - for availability control
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      images: {
        type: DataTypes.JSONB,
        allowNull: true
      },
      variants: {
        type: DataTypes.JSONB,
        allowNull: true
      },
      status: {
        type: DataTypes.ENUM('active', 'inactive', 'archived'),
        defaultValue: 'active'
      },
      // OPTIONAL: For future bargaining feature
      bargainLimit: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        field: 'bargain_limit'
      },
      // OPTIONAL: For digital products
      productType: {
        type: DataTypes.ENUM('physical', 'digital'),
        defaultValue: 'physical',
        field: 'product_type'
      },
      fileUrl: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'file_url'
      }
    };
  }

 
  static initModel(sequelize) {
    return super.init(this.fields(), {
      sequelize,
      tableName: 'products',
      modelName: 'Product'
    });
  }

  static associate(models) {
    this.belongsTo(models.Tenant, {
      foreignKey: 'tenantId',
      as: 'tenant'
    });
    this.belongsTo(models.Category, {
      foreignKey: 'categoryId',
      as: 'category'
    });
    this.hasMany(models.OrderItem, {
      foreignKey: 'productId',
      as: 'orderItems'
    });
  }
}

module.exports = Product;
