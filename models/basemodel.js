const { Model, DataTypes } = require('sequelize');

class BaseModel extends Model {
  static init(attributes, options) {
    return super.init({
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'created_at'
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'updated_at'
      },
      ...attributes
    }, {
      timestamps: true,
      underscored: true,
      ...options
    });
  }
}

module.exports = BaseModel;
