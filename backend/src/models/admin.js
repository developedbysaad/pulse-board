"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Admin extends Model {
    static associate(models) {
      Admin.hasMany(models.Election, {
        foreignKey: "adminId",
        onDelete: "CASCADE",
      });
    }

    toJSON() {
      const { password: _password, ...rest } = this.get();
      return rest;
    }
  }

  Admin.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { notEmpty: { msg: "Name is required" } },
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: { msg: "Email is required" },
          isEmail: { msg: "Email is not valid" },
        },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    { sequelize, modelName: "Admin" }
  );

  return Admin;
};
