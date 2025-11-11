const { DataTypes } = require('sequelize');
const BaseModel = require('./basemodel');

class OrderItem extends BaseModel {
  static fields() {
    return {
      orderId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'order_id',
        references: { model: 'orders', key: 'id' }
      },
      productId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'product_id',
        references: { model: 'products', key: 'id' }
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true
      },
      unitPrice: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        field: 'unit_price'
      },
      subtotal: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false
      },
      tax: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
      discount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
      total: { type: DataTypes.DECIMAL(12, 2), allowNull: true }
    };
  }

  static initModel(sequelize) {
    return super.init(this.fields(), {
      sequelize,
      tableName: 'order_items',
      modelName: 'OrderItem'
    });
  }

  static associate(models) {
    this.belongsTo(models.Order, {
      foreignKey: 'orderId',
      as: 'order'
    });
    this.belongsTo(models.Product, {
      foreignKey: 'productId',
      as: 'product'
    });
  }
}

module.exports = OrderItem;
