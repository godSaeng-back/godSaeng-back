'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ViewCounts extends Model {
    static associate(models) {
      this.belongsTo(models.Users, {
        foreignKey: 'UserId',
        targetKey: 'userId',
        onDelete: 'CASCADE',
      });
      this.belongsTo(models.Shares, {
        foreignKey: 'ShareId',
        targetKey: 'shareId',
        onDelete: 'CASCADE',
      });
    }
  }
  ViewCounts.init(
    {
      viewId: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      UserId: {
        type: DataTypes.INTEGER,
        references: {
          model: 'Users',
          key: 'userId',
        },
      },
      ShareId: {
        type: DataTypes.INTEGER,
        references: {
          model: 'Shares',
          key: 'shareId',
        },
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'ViewCounts',
      timestamps: false,
    }
  );
  return ViewCounts;
};
