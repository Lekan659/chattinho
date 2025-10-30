const { DataTypes } = require('sequelize');
const BaseModel = require('./basemodel');

class Message extends BaseModel {
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
      messageId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'message_id'
      },
      fromNumber: {
        type: DataTypes.STRING(20),
        allowNull: true,
        field: 'from_number'
      },
      fromHandle: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'from_handle'
      },
      toNumber: {
        type: DataTypes.STRING(20),
        allowNull: false,
        field: 'to_number'
      },
      conversationId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'conversation_id',
        references: {
          model: 'conversations',
          key: 'id'
        }
      },
      messageText: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'message_text'
      },
      messageType: {
        type: DataTypes.STRING(20),
        defaultValue: 'text',
        field: 'message_type'
      },
      media: {
        type: DataTypes.STRING(20),
        defaultValue: 'whatsapp',
        field: 'media'
      },
      direction: {
        type: DataTypes.ENUM('inbound', 'outbound'),
        allowNull: false
      },
      aiResponse: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'ai_response'
      },
      aiTokensUsed: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'ai_tokens_used'
      },
      status: {
        type: DataTypes.STRING(20),
        defaultValue: 'sent'
      }
    };
  }

  static initModel(sequelize) {
    return super.init(this.fields(), {
      sequelize,
      tableName: 'messages',
      modelName: 'Message',
      indexes: [
        {
          name: 'idx_tenant_messages',
          fields: ['tenant_id', 'created_at']
        },
        {
          name: 'idx_phone_messages',
          fields: ['from_number', 'created_at']
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
      foreignKey: 'fromNumber',
      targetKey: 'whatsappNumber',
      as: 'customer',
      constraints: false 
    });



    this.belongsTo(models.Conversation, {
      foreignKey: 'conversationId',
      as: 'conversation',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  }
}

module.exports = Message;