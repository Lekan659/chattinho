const { DataTypes } = require('sequelize');
const BaseModel = require('./basemodel');

class Customer extends BaseModel {
  static fields() {
    return {
    tenantId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'tenant_id',
    references: {
        model: 'tenants', 
        key: 'id'
    }
   
    },
      whatsappNumber: {
        type: DataTypes.STRING(20),
        allowNull: true,
        unique: false,
        field: 'whatsapp_number'
      },
      instagramHandle: {
        type: DataTypes.STRING(100),
        allowNull: true,
        unique: false,
        field: 'instagram_handle'
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      lastMessageAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'last_message_at'
      },
      status: {
        type: DataTypes.ENUM('active', 'blocked'),
        defaultValue: 'active'
      }
    };
  }

  static initModel(sequelize) {
    return super.init(this.fields(), {
      sequelize,
      tableName: 'customers',
      modelName: 'Customer'
    });
  }

static associate(models) {
  this.belongsTo(models.Tenant, {
    foreignKey: 'tenantId',
    as: 'tenant',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });
}
}

module.exports = Customer;