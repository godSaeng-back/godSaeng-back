"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class FeedImages extends Model {
    static associate(models) {
      this.belongsTo(models.Feeds, {
        targetKey: "feedId",
        foreignKey: "FeedId",
      });
      // this.belongsTo(models.Users, {
      //   // 2. Users 모델에게 N:1 관계 설정을 합니다.
      //   targetKey: "userId", // 3. Users 모델의 userId 컬럼을
      //   foreignKey: "UserId", // 4. feedimages 모델의 UserId 컬럼과 연결합니다.
      // });
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
      userId: {
        allowNull: false,
        type: DataTypes.INTEGER,
        references: {
          model: "Users",
          key: "userId",
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
