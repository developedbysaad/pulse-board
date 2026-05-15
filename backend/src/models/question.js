"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Question extends Model {
    static associate(models) {
      Question.belongsTo(models.Election, { foreignKey: "electionId" });
      Question.hasMany(models.Option, {
        foreignKey: "questionId",
        onDelete: "CASCADE",
      });
    }
  }

  Question.init(
    {
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { notEmpty: { msg: "Question title is required" } },
      },
      description: { type: DataTypes.TEXT },
      isRequired: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      electionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    { sequelize, modelName: "Question" }
  );

  return Question;
};
