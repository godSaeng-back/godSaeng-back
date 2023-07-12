'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Comment extends Model {
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
  Comment.init(
    {
      commentId: {
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
      commentName: {
        type: DataTypes.STRING,
      },
      anonymous: {
        type: DataTypes.BOOLEAN,
      },
      content: {
        allowNull: false,
        type: DataTypes.STRING,
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
      modelName: 'Comment',
    }
  );
  return Comment;
};
