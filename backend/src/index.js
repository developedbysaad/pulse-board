"use strict";

const http = require("http");
const env = require("./config/env");
const { app, sessionMiddleware } = require("./app");
const { attachIO } = require("./sockets");
const { sequelize } = require("./models");

const server = http.createServer(app);
attachIO(server, sessionMiddleware);

async function start() {
  try {
    await sequelize.authenticate();
    server.listen(env.PORT, () => {
      console.log(`Pulse Board API listening on :${env.PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

start();

const shutdown = (signal) => {
  console.log(`${signal} received, shutting down`);
  server.close(() => {
    sequelize.close().finally(() => process.exit(0));
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
