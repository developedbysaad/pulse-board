"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Subscriber extends Model {
    static associate(models) {
      Subscriber.belongsTo(models.Election, {
        foreignKey: "electionId",
        onDelete: "CASCADE",
      });
    }
  }

  Subscriber.init(
    {
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isEmail: { msg: "Email is not valid" },
          notEmpty: { msg: "Email is required" },
        },
      },
      electionId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      notifyOn: {
        type: DataTypes.ENUM("results", "all"),
        allowNull: false,
        defaultValue: "results",
      },
    },
    {
      sequelize,
      modelName: "Subscriber",
      indexes: [
        {
          unique: true,
          fields: ["email", "electionId"],
          name: "subscribers_email_election_unique",
        },
      ],
    }
  );

  return Subscriber;
};
