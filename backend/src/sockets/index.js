"use strict";

const { Server } = require("socket.io");
const env = require("../config/env");
const { Election } = require("../models");

let io = null;

function attachIO(httpServer, sessionMiddleware) {
  io = new Server(httpServer, {
    cors: env.FRONTEND_ORIGIN
      ? { origin: env.FRONTEND_ORIGIN, credentials: true }
      : undefined,
  });

  io.engine.use(sessionMiddleware);

  io.on("connection", (socket) => {
    socket.on("election:join", async ({ electionId, customUrl } = {}) => {
      try {
        let election = null;
        if (electionId) election = await Election.findByPk(electionId);
        else if (customUrl) {
          election = await Election.findOne({ where: { customUrl } });
        }
        if (!election) return;

        socket.join(`election:${election.id}:public`);

        const sessionUser = socket.request.session?.passport?.user;
        if (
          sessionUser &&
          sessionUser.type === "admin" &&
          sessionUser.id === election.adminId
        ) {
          socket.join(`election:${election.id}:admin`);
        }
      } catch (err) {
        console.error("election:join error:", err);
      }
    });

    socket.on("election:leave", ({ electionId }) => {
      if (!electionId) return;
      socket.leave(`election:${electionId}:public`);
      socket.leave(`election:${electionId}:admin`);
    });
  });

  return io;
}

function getIO() {
  return io;
}

module.exports = { attachIO, getIO };
