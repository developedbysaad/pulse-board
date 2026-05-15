"use strict";

const bcrypt = require("bcrypt");
const createError = require("http-errors");
const { Voter } = require("../models");

const SALT_ROUNDS = 10;

async function list(req, res, next) {
  try {
    const voters = await Voter.findAll({
      where: { electionId: req.election.id },
      attributes: { exclude: ["password"] },
      order: [["id", "ASC"]],
    });
    res.json({ voters });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    if (req.election.launched) throw createError(409, "Cannot add voters after launch");
    const password = await bcrypt.hash(req.body.password, SALT_ROUNDS);
    try {
      const voter = await Voter.create({
        voterId: req.body.voterId,
        password,
        electionId: req.election.id,
      });
      res.status(201).json({ voter });
    } catch (err) {
      if (err.name === "SequelizeUniqueConstraintError") {
        throw createError(409, "Voter ID already exists for this election");
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    if (req.election.launched) throw createError(409, "Cannot edit voters after launch");
    const voter = await Voter.findOne({
      where: { id: req.params.voterId, electionId: req.election.id },
    });
    if (!voter) throw createError(404, "Voter not found");

    const updates = {};
    if (req.body.voterId !== undefined) updates.voterId = req.body.voterId;
    if (req.body.password !== undefined) {
      updates.password = await bcrypt.hash(req.body.password, SALT_ROUNDS);
    }
    await voter.update(updates);
    res.json({ voter });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    if (req.election.launched) throw createError(409, "Cannot remove voters after launch");
    const voter = await Voter.findOne({
      where: { id: req.params.voterId, electionId: req.election.id },
    });
    if (!voter) throw createError(404, "Voter not found");
    await voter.destroy();
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove };
