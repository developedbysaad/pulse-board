"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Voter extends Model {
    static associate(models) {
      Voter.belongsTo(models.Election, { foreignKey: "electionId" });
      Voter.hasMany(models.Response, {
        foreignKey: "voterId",
        onDelete: "CASCADE",
      });
    }

    toJSON() {
      const { password: _password, ...rest } = this.get();
      return rest;
    }
  }

  Voter.init(
    {
      voterId: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { notEmpty: { msg: "Voter ID is required" } },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      voted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      electionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "Voter",
      indexes: [{ unique: true, fields: ["voterId", "electionId"] }],
    }
  );

  return Voter;
};
