'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Likes extends Model {
    static associate(models) {
      this.belongsTo(models.Users, {
        foreignKey: 'UserId',
        targetKey: 'userId',
      });
      this.belongsTo(models.Shares, {
        foreignKey: 'ShareId',
        targetKey: 'shareId',
      });
    }
  }
  Likes.init(
    {
      likeId: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      UserId: {
        allowNull: false,
        type: DataTypes.INTEGER,
        references: {
          model: 'Users',
          key: 'userId',
        },
        onDelete: 'CASCADE',
      },
      ShareId: {
        allowNull: false,
        type: DataTypes.INTEGER,
        references: {
          model: 'Shares',
          key: 'shareId',
        },
        onDelete: 'CASCADE',
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
      modelName: 'Likes',
    }
  );
  return Likes;
};
