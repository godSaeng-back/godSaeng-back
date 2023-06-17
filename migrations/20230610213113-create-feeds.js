"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Feeds", {
      feedId: {
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
        onDelete: "CASCADE", // 만약 Users 모델의 userId가 삭제되면, Posts 모델의 데이터가 삭제됩니다.
      },
      emotion: {
        allowNull: false, // NOT NULL
        type: Sequelize.STRING,
      },
      howEat: {
        allowNull: false, // NOT NULL
        type: Sequelize.BOOLEAN,
      },
      didGym: {
        allowNull: false, // NOT NULL
        type: Sequelize.BOOLEAN,
      },
      goodSleep: {
        allowNull: false, // NOT NULL
        type: Sequelize.BOOLEAN,
      },
      calendarDay: {
        type: Sequelize.STRING,
      },
      didShare: {
        type: Sequelize.BOOLEAN,
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
    await queryInterface.dropTable("Feeds");
  },
};
