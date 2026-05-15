"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Subscribers", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      electionId: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      notifyOn: {
        type: Sequelize.ENUM("results", "all"),
        allowNull: false,
        defaultValue: "results",
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

    await queryInterface.addConstraint("Subscribers", {
      fields: ["electionId"],
      type: "foreign key",
      name: "Subscribers_electionId_fkey",
      references: {
        table: "Elections",
        field: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    // One subscription per (email, election) — null electionId means "global".
    await queryInterface.addIndex("Subscribers", ["email", "electionId"], {
      name: "subscribers_email_election_unique",
      unique: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("Subscribers");
  },
};
