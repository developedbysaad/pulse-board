"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Response extends Model {
    static associate(models) {
      Response.belongsTo(models.Election, { foreignKey: "electionId" });
      Response.belongsTo(models.Voter, { foreignKey: "voterId" });
    }
  }

  Response.init(
    {
      electionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      voterId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      answers: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
      ipHash: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    { sequelize, modelName: "Response" }
  );

  return Response;
};
