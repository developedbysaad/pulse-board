"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Elections", "adminId", {
      type: Sequelize.INTEGER,
      allowNull: false,
    });

    await queryInterface.addConstraint("Elections", {
      fields: ["adminId"],
      type: "foreign key",
      name: "Elections_adminId_fkey",
      references: {
        table: "Admins",
        field: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint("Elections", "Elections_adminId_fkey");
    await queryInterface.removeColumn("Elections", "adminId");
  },
};
