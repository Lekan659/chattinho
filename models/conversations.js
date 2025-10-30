const { DataTypes } = require('sequelize');
const BaseModel = require('./basemodel');

class Conversation extends BaseModel {
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
      customerNumber: {
        type: DataTypes.STRING(20),
        allowNull: true,
        field: 'customer_number'
      },
      customerInstagramHandle: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'customer_instagram_handle',
      },
      context: {
        type: DataTypes.JSONB,
        defaultValue: {},
        allowNull: false
      },
      salesIntent: {
        type: DataTypes.ENUM('red_hot', 'yellow', 'cold', 'purple'),
        defaultValue: 'cold',
        field: 'sales_intent'
      },
      lastMessageAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'last_message_at'
      },
      status: {
        type: DataTypes.STRING(20),
        defaultValue: 'active'
      }
    };
  }

  static initModel(sequelize) {
    return super.init(this.fields(), {
      sequelize,
      tableName: 'conversations',
      modelName: 'Conversation',
      indexes: [
        {
          unique: true,
          fields: ['tenant_id', 'customer_number']
        }
      ]
    });
  }

  static associate(models) {
    // Belongs to Tenant
    this.belongsTo(models.Tenant, {
      foreignKey: 'tenantId',
      as: 'tenant',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });


    this.belongsTo(models.Customer, {
      foreignKey: 'customerNumber',
      targetKey: 'whatsappNumber',
      as: 'customer',
      constraints: false 
    });

    this.belongsTo(models.Customer, {
      foreignKey: 'instagramHandle',
      targetKey: 'instagramHandle',
      as: 'instagramCustomer',
      constraints: false 
        });
    // Has many Messages

    this.hasMany(models.Message, {
      foreignKey: 'conversationId',
      as: 'messages'
    });
  }
}

module.exports = Conversation;