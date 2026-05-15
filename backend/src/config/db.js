"use strict";

require("dotenv").config();

const common = {
  dialect: "postgres",
  logging: false,
};

module.exports = {
  development: {
    ...common,
    username: process.env.DEV_DB_USERNAME,
    password: process.env.DEV_DB_PASSWORD,
    database: process.env.DEV_DB_NAME,
    host: process.env.DEV_DB_HOST,
    port: process.env.DEV_DB_PORT || 5432,
  },
  test: {
    ...common,
    username: process.env.TEST_DB_USERNAME,
    password: process.env.TEST_DB_PASSWORD,
    database: process.env.TEST_DB_NAME,
    host: process.env.TEST_DB_HOST,
    port: process.env.TEST_DB_PORT || 5432,
  },
  production: {
    ...common,
    use_env_variable: "DATABASE_URL",
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false },
    },
  },
};
