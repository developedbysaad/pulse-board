"use strict";

const { getIO } = require("./index");

function emitResponseNew(electionId, payload) {
  const io = getIO();
  if (!io) return;
  io.to(`election:${electionId}:admin`).emit("response:new", payload);
}

function emitElectionStatus(electionId, status) {
  const io = getIO();
  if (!io) return;
  io.to(`election:${electionId}:admin`).emit("election:status", status);
  io.to(`election:${electionId}:public`).emit("election:status", {
    launched: status.launched,
    ended: status.ended,
    resultsPublished: status.resultsPublished,
    expiresAt: status.expiresAt,
  });
}

module.exports = { emitResponseNew, emitElectionStatus };
