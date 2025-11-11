const { DataTypes } = require('sequelize');
const BaseModel = require('./basemodel');

class Order extends BaseModel {
  static fields() {
    return {
      tenantId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'tenant_id',
        references: { model: 'tenants', key: 'id' }
      },
      customerId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'customer_id',
        references: { model: 'customers', key: 'id' }
      },
      status: {
        type: DataTypes.ENUM('pending', 'confirmed', 'shipped', 'delivered', 'cancelled'),
        defaultValue: 'pending'
      },
      totalAmount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true
      },
            deliveryAddress: { 
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'delivery_address'
      },
      deliveryPhone: { 
        type: DataTypes.STRING(20),
        allowNull: true,
        field: 'delivery_phone'
      },
      deliveryNotes: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'delivery_notes'
      }
    };
  }

  static initModel(sequelize) {
    return super.init(this.fields(), {
      sequelize,
      tableName: 'orders',
      modelName: 'Order'
    });
  }

  static associate(models) {
    this.belongsTo(models.Tenant, {
      foreignKey: 'tenantId',
      as: 'tenant'
    });
    this.belongsTo(models.Customer, {
      foreignKey: 'customerId',
      as: 'customer'
    });
    this.hasMany(models.OrderItem, {
      foreignKey: 'orderId',
      as: 'items',
      onDelete: 'CASCADE'
    });
    // this.hasMany(models.Payment, { // ADDED - order-payment relationship
    //   foreignKey: 'orderId',
    //   as: 'payments'
    // });
  }
}

module.exports = Order;
