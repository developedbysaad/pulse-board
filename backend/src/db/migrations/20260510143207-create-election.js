"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Elections", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      mode: {
        type: Sequelize.ENUM("authenticated", "anonymous"),
        allowNull: false,
        defaultValue: "authenticated",
      },
      launched: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      ended: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      resultsPublished: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      // Public-facing slug. Always populated — the controller auto-
      // generates one from the poll name on create if the admin doesn't
      // supply it explicitly. Unique index lets us look up by slug
      // without scanning, and lets the API trust uniqueness checks.
      customUrl: {
        type: Sequelize.STRING(64),
        allowNull: false,
        unique: true,
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
  },
  async down(queryInterface) {
    await queryInterface.dropTable("Elections");
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_Elections_mode";'
    );
  },
};
