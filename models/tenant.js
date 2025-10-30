const { DataTypes } = require('sequelize');
const BaseModel = require('./basemodel');
const Customer = require('./customer'); 

class Tenant extends BaseModel {
  static fields() {
    return {
      businessName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'business_name'
      },
      contactPerson: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'contact_person'
      },
      whatsappNumber: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
        field: 'whatsapp_number'
      },
        instagramHandle: {
        type: DataTypes.STRING(100),
        allowNull: true,
        unique: true,
        field: 'instagram_handle'
      },
      whatsappBusinessId: {
        type: DataTypes.STRING(255),
        field: 'whatsapp_business_id'
      },
      whatsappAccessToken: {
        type: DataTypes.TEXT,
        field: 'whatsapp_access_token'
      },
      businessType: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'business_type'
      },
      subscriptionPlan: {
        type: DataTypes.ENUM('basic', 'pro', 'enterprise'),
        defaultValue: 'basic',
        field: 'subscription_plan'
      },
      status: {
        type: DataTypes.ENUM('active', 'inactive', 'suspended'),
        defaultValue: 'active'
      },
      botInstructions: {
        type: DataTypes.TEXT,
        field: 'bot_instructions'
      },
      webhookSecret: {
        type: DataTypes.STRING(255),
        field: 'webhook_secret'
      },
      businessAddress: {
        type: DataTypes.TEXT,
        field: 'business_address'
      },
      businessEmail: {
        type: DataTypes.STRING(255),
        field: 'business_email'
      },
      businessLogo: {
        type: DataTypes.STRING(500),
        field: 'business_logo'
      },
      taxNumber: {
        type: DataTypes.STRING(50),
        field: 'tax_number'
      },
      currency: {
        type: DataTypes.STRING(3),
        defaultValue: 'NGN'
      },
      timezone: {
        type: DataTypes.STRING(50),
        defaultValue: 'Africa/Lagos'
      }
    };
  }

  static initModel(sequelize) {
    return super.init(this.fields(), {
      sequelize,
      tableName: 'tenants',
      modelName: 'Tenant'
    });
  }

static associate(models) {
  this.hasMany(models.Customer, {
    foreignKey: 'tenantId',
    as: 'customers',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });
}
}

module.exports = Tenant;
