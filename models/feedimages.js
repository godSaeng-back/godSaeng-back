"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class FeedImages extends Model {
    static associate(models) {
      this.belongsTo(models.Feeds, {
        targetKey: "feedId",
        foreignKey: "FeedId",
      });
    }
  }
  FeedImages.init(
    {
      imageId: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      FeedId: {
        allowNull: false,
        type: DataTypes.INTEGER,
        references: {
          model: "Feeds",
          key: "feedId",
        },
        onDelete: "CASCADE",
      },
      imagePath: {
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
      modelName: "FeedImages",
    }
  );
  return FeedImages;
};
