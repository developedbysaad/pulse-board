"use strict";

const { Question, Option, Voter, Response } = require("../models");

async function summary(req, res, next) {
  try {
    const election = req.election;

    const [questions, responses, totalVoters] = await Promise.all([
      Question.findAll({
        where: { electionId: election.id },
        include: [Option],
        order: [
          ["id", "ASC"],
          [Option, "id", "ASC"],
        ],
      }),
      Response.findAll({ where: { electionId: election.id } }),
      election.mode === "authenticated"
        ? Voter.count({ where: { electionId: election.id } })
        : Promise.resolve(null),
    ]);

    const tally = new Map();
    for (const r of responses) {
      for (const a of r.answers) {
        const key = `${a.questionId}:${a.optionId}`;
        tally.set(key, (tally.get(key) || 0) + 1);
      }
    }

    const perQuestion = questions.map((q) => ({
      id: q.id,
      title: q.title,
      isRequired: q.isRequired,
      options: q.Options.map((o) => ({
        id: o.id,
        label: o.label,
        count: tally.get(`${q.id}:${o.id}`) || 0,
      })),
    }));

    const totalResponses = responses.length;
    let participation = null;
    if (totalVoters !== null && totalVoters > 0) {
      participation = {
        responses: totalResponses,
        eligible: totalVoters,
        percent: Math.round((totalResponses / totalVoters) * 100),
      };
    }

    res.json({
      electionId: election.id,
      election: {
        id: election.id,
        name: election.name,
        customUrl: election.customUrl,
      },
      mode: election.mode,
      launched: election.launched,
      ended: election.ended,
      resultsPublished: election.resultsPublished,
      expiresAt: election.expiresAt,
      totalResponses,
      participation,
      perQuestion,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { summary };
