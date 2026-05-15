"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Election extends Model {
    static associate(models) {
      Election.belongsTo(models.Admin, { foreignKey: "adminId" });
      Election.hasMany(models.Question, {
        foreignKey: "electionId",
        onDelete: "CASCADE",
      });
      Election.hasMany(models.Voter, {
        foreignKey: "electionId",
        onDelete: "CASCADE",
      });
      Election.hasMany(models.Response, {
        foreignKey: "electionId",
        onDelete: "CASCADE",
      });
    }

    isAcceptingResponses() {
      if (!this.launched) return false;
      if (this.ended) return false;
      if (this.expiresAt && new Date() > this.expiresAt) return false;
      return true;
    }
  }

  Election.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { notEmpty: { msg: "Election name is required" } },
      },
      mode: {
        type: DataTypes.ENUM("authenticated", "anonymous"),
        allowNull: false,
        defaultValue: "authenticated",
      },
      customUrl: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
        validate: {
          is: {
            args: /^[a-z0-9-]+$/,
            msg: "Slug uses lowercase letters, numbers, and dashes only",
          },
          notEmpty: { msg: "Slug is required" },
        },
      },
      launched: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      ended: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      resultsPublished: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      adminId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    { sequelize, modelName: "Election" }
  );

  return Election;
};
