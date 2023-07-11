'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Shares extends Model {
    static associate(models) {
      this.belongsTo(models.Users, {
        foreignKey: 'UserId',
        targetKey: 'userId',
      });

      this.hasMany(models.Likes, {
        foreignKey: 'ShareId',
        sourceKey: 'shareId',
      });

      this.hasMany(models.ViewCounts, {
        foreignKey: 'ShareId',
        sourceKey: 'shareId',
      });
    }
  }
  Shares.init(
    {
      shareId: {
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
      title: {
        allowNull: false,
        type: DataTypes.STRING,
      },
      content: {
        allowNull: false,
        type: DataTypes.STRING,
      },
      shareName: {
        allowNull: false,
        type: DataTypes.STRING,
      },
      imagePath: {
        allowNull: true,
        type: DataTypes.STRING,
      },
      anonymous: {
        type: DataTypes.BOOLEAN,
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
      modelName: 'Shares',
    }
  );
  return Shares;
};
