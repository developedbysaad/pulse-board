"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PasswordReset extends Model {
    static associate(models) {
      PasswordReset.belongsTo(models.Admin, {
        foreignKey: "adminId",
        onDelete: "CASCADE",
      });
    }

    isUsable(now = new Date()) {
      return !this.usedAt && this.expiresAt > now;
    }
  }

  PasswordReset.init(
    {
      adminId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      tokenHash: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      usedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    { sequelize, modelName: "PasswordReset" }
  );

  return PasswordReset;
};
