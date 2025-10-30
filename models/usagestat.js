const { DataTypes } = require('sequelize');
const BaseModel = require('./basemodel');

class UsageStat extends BaseModel {
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
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      messagesSent: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'messages_sent'
      },
      messagesReceived: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'messages_received'
      },
      aiTokensUsed: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'ai_tokens_used'
      },
      conversionEvents: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'conversion_events'
      }
    };
  }

  static initModel(sequelize) {
    return super.init(this.fields(), {
      sequelize,
      tableName: 'usage_stats',
      modelName: 'UsageStat',
      indexes: [
        {
          unique: true,
          fields: ['tenant_id', 'date'],
          name: 'uniq_usage_stats_tenant_date'
        }
      ]
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

module.exports = UsageStat;
