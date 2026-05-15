"use strict";

const createError = require("http-errors");
const { Election } = require("../models");
const { emitElectionStatus } = require("../sockets/emitters");

// If an election is past expiresAt but still has ended=false, flip it now and
// notify any connected sockets. Side-effecting on read is OK here — it keeps
// the admin's view honest without a separate cron job.
async function enforceExpiry(election) {
  if (!election) return election;
  if (election.ended) return election;
  if (!election.expiresAt) return election;
  if (new Date() <= new Date(election.expiresAt)) return election;

  await election.update({ ended: true });
  emitElectionStatus(election.id, {
    launched: election.launched,
    ended: true,
    resultsPublished: election.resultsPublished,
    expiresAt: election.expiresAt,
  });
  return election;
}

function requireAdmin(req, res, next) {
  if (req.user && req.user.type === "admin") return next();
  return next(createError(401, "Authentication required"));
}

function requireVoter(req, res, next) {
  if (req.user && req.user.type === "voter") return next();
  return next(createError(401, "Voter authentication required"));
}

function requireElectionOwner(paramName = "id") {
  return async (req, res, next) => {
    try {
      const election = await Election.findByPk(req.params[paramName]);
      if (!election) return next(createError(404, "Election not found"));
      if (election.adminId !== req.user.id) {
        return next(createError(403, "Not your election"));
      }
      await enforceExpiry(election);
      req.election = election;
      next();
    } catch (err) {
      next(err);
    }
  };
}

async function loadElectionByCustomUrl(req, res, next) {
  try {
    const election = await Election.findOne({
      where: { customUrl: req.params.customUrl },
    });
    if (!election) return next(createError(404, "Election not found"));
    await enforceExpiry(election);
    req.election = election;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  enforceExpiry,
  requireAdmin,
  requireVoter,
  requireElectionOwner,
  loadElectionByCustomUrl,
};
