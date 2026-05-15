"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Option extends Model {
    static associate(models) {
      Option.belongsTo(models.Question, { foreignKey: "questionId" });
    }
  }

  Option.init(
    {
      label: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { notEmpty: { msg: "Option label is required" } },
      },
      questionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    { sequelize, modelName: "Option" }
  );

  return Option;
};
