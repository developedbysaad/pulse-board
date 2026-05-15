"use strict";

const createError = require("http-errors");
const { Option, Question } = require("../models");

async function ensureOwnedQuestion(req) {
  const question = await Question.findOne({
    where: { id: req.params.questionId, electionId: req.election.id },
  });
  if (!question) throw createError(404, "Question not found");
  return question;
}

async function list(req, res, next) {
  try {
    const question = await ensureOwnedQuestion(req);
    const options = await Option.findAll({
      where: { questionId: question.id },
      order: [["id", "ASC"]],
    });
    res.json({ options });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    if (req.election.launched) throw createError(409, "Cannot edit a launched election");
    const question = await ensureOwnedQuestion(req);
    const option = await Option.create({
      label: req.body.label,
      questionId: question.id,
    });
    res.status(201).json({ option });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    if (req.election.launched) throw createError(409, "Cannot edit a launched election");
    const question = await ensureOwnedQuestion(req);
    const option = await Option.findOne({
      where: { id: req.params.optionId, questionId: question.id },
    });
    if (!option) throw createError(404, "Option not found");
    await option.update({ label: req.body.label });
    res.json({ option });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    if (req.election.launched) throw createError(409, "Cannot edit a launched election");
    const question = await ensureOwnedQuestion(req);
    const option = await Option.findOne({
      where: { id: req.params.optionId, questionId: question.id },
    });
    if (!option) throw createError(404, "Option not found");
    await option.destroy();
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove };
