"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("PasswordResets", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      adminId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "Admins", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      tokenHash: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      usedAt: {
        type: Sequelize.DATE,
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

    await queryInterface.addIndex("PasswordResets", ["tokenHash"], {
      name: "password_resets_token_hash_idx",
      unique: true,
    });

    await queryInterface.addIndex("PasswordResets", ["adminId"], {
      name: "password_resets_admin_id_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("PasswordResets");
  },
};
