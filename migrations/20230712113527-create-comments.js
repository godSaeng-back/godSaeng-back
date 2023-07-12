"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Comments", {
      commentId: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      UserId: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: {
          model: "Users", // Users 모델을 참조합니다.
          key: "userId", // Users 모델의 userId를 참조합니다.
        },
        onDelete: "CASCADE", // 만약 Users 모델의 userId가 삭제되면, Comments 모델의 데이터가 삭제됩니다.
      },
      ShareId: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: {
          model: "Shares", // Shares 모델을 참조합니다.
          key: "shareId", // Shares 모델의 shareId를 참조합니다.
        },
        onDelete: "CASCADE", // 만약 Shares 모델의 shareId가 삭제되면, Comments 모델의 데이터가 삭제됩니다.
      },
      commentName: {
        type: Sequelize.STRING,
      },
      anonymous: {
        type: Sequelize.BOOLEAN,
      },
      content: {
        allowNull: false, // NOT NULL
        type: Sequelize.STRING,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn("now"),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn("now"),
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Comments");
  },
};
