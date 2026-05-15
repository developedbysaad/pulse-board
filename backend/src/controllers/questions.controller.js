"use strict";

const createError = require("http-errors");
const { Question, Option } = require("../models");

async function list(req, res, next) {
  try {
    const questions = await Question.findAll({
      where: { electionId: req.election.id },
      include: [Option],
      order: [
        ["id", "ASC"],
        [Option, "id", "ASC"],
      ],
    });
    res.json({ questions });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    if (req.election.launched) throw createError(409, "Cannot edit a launched election");
    const question = await Question.create({
      ...req.body,
      electionId: req.election.id,
    });
    res.status(201).json({ question });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    if (req.election.launched) throw createError(409, "Cannot edit a launched election");
    const question = await Question.findOne({
      where: { id: req.params.questionId, electionId: req.election.id },
    });
    if (!question) throw createError(404, "Question not found");
    await question.update(req.body);
    res.json({ question });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    if (req.election.launched) throw createError(409, "Cannot edit a launched election");
    const question = await Question.findOne({
      where: { id: req.params.questionId, electionId: req.election.id },
    });
    if (!question) throw createError(404, "Question not found");
    await question.destroy();
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove };
