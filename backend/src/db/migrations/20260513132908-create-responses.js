"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Responses", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      electionId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      voterId: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      answers: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      ipHash: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.addConstraint("Responses", {
      fields: ["electionId"],
      type: "foreign key",
      name: "Responses_electionId_fkey",
      references: {
        table: "Elections",
        field: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    await queryInterface.addConstraint("Responses", {
      fields: ["voterId"],
      type: "foreign key",
      name: "Responses_voterId_fkey",
      references: {
        table: "Voters",
        field: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    await queryInterface.addIndex("Responses", ["electionId"], {
      name: "Responses_electionId_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("Responses");
  },
};
