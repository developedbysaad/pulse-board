"use strict";

const crypto = require("crypto");
const createError = require("http-errors");
const passport = require("../auth/passport");
const env = require("../config/env");
const {
  sequelize,
  Question,
  Option,
  Voter,
  Response,
  Subscriber,
} = require("../models");
const { emitResponseNew } = require("../sockets/emitters");

function hashIp(ip) {
  return crypto
    .createHmac("sha256", env.COOKIE_SECRET)
    .update(ip || "")
    .digest("hex")
    .slice(0, 32);
}

function publicElectionShape(election, questions) {
  return {
    id: election.id,
    name: election.name,
    customUrl: election.customUrl,
    mode: election.mode,
    launched: election.launched,
    ended: election.ended,
    expiresAt: election.expiresAt,
    resultsPublished: election.resultsPublished,
    isAcceptingResponses: election.isAcceptingResponses(),
    questions: questions.map((q) => ({
      id: q.id,
      title: q.title,
      description: q.description,
      isRequired: q.isRequired,
      options: q.Options.map((o) => ({ id: o.id, label: o.label })),
    })),
  };
}

/**
 * Per-browser record of which anonymous polls this session has already
 * voted in. Lives on the express-session row (so it persists across
 * tabs and survives reload) and is the canonical "you voted" check for
 * anonymous mode. ipHash is a softer secondary check.
 */
function hasVotedInSession(req, electionId) {
  const list = req.session?.votedIn;
  return Array.isArray(list) && list.includes(electionId);
}

function markVotedInSession(req, electionId) {
  if (!req.session) return;
  if (!Array.isArray(req.session.votedIn)) req.session.votedIn = [];
  if (!req.session.votedIn.includes(electionId)) {
    req.session.votedIn.push(electionId);
  }
}

async function hasVotedFromIp(electionId, ipHash) {
  if (!ipHash) return false;
  const row = await Response.findOne({
    where: { electionId, ipHash },
    attributes: ["id"],
  });
  return !!row;
}

async function getBallot(req, res, next) {
  try {
    const election = req.election;
    const questions = await Question.findAll({
      where: { electionId: election.id },
      include: [Option],
      order: [
        ["id", "ASC"],
        [Option, "id", "ASC"],
      ],
    });

    const payload = publicElectionShape(election, questions);

    if (election.mode === "authenticated") {
      payload.requiresAuth = true;
      payload.voterAuthenticated =
        req.user?.type === "voter" && req.user?.electionId === election.id;
      if (payload.voterAuthenticated) {
        const voter = await Voter.findByPk(req.user.id);
        payload.alreadyVoted = voter?.voted ?? false;
      }
    } else {
      payload.requiresAuth = false;
      // Two-tier check for anon polls. Session is per-browser and
      // accurate; ipHash catches the case where someone clears their
      // cookies and immediately reloads from the same network.
      const sessionVote = hasVotedInSession(req, election.id);
      const ipVote = sessionVote
        ? false
        : await hasVotedFromIp(election.id, hashIp(req.ip));
      payload.alreadyVoted = sessionVote || ipVote;
    }

    res.json({ election: payload });
  } catch (err) {
    next(err);
  }
}

function voterLogin(req, res, next) {
  passport.authenticate("voter-local", (err, user, info) => {
    if (err) return next(err);
    if (!user) return next(createError(401, info?.message || "Invalid credentials"));
    req.login(user, (loginErr) => {
      if (loginErr) return next(loginErr);
      res.json({ user: req.user });
    });
  })(req, res, next);
}

function voterLogout(req, res, next) {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy((destroyErr) => {
      if (destroyErr) return next(destroyErr);
      res.clearCookie("connect.sid");
      res.status(204).end();
    });
  });
}

async function submitResponse(req, res, next) {
  try {
    const election = req.election;
    if (!election.isAcceptingResponses()) {
      throw createError(410, "This poll is no longer accepting responses");
    }

    const { answers } = req.body;

    let voterId = null;
    const ipHash = hashIp(req.ip);
    if (election.mode === "authenticated") {
      if (req.user?.type !== "voter" || req.user.electionId !== election.id) {
        throw createError(401, "Voter login required for this poll");
      }
      const voter = await Voter.findByPk(req.user.id);
      if (!voter) throw createError(404, "Voter not found");
      if (voter.voted) {
        throw createError(409, "You've already voted in this poll. Thanks!");
      }
      voterId = voter.id;
    } else {
      // Anonymous mode: block double-submit using session + ipHash.
      if (hasVotedInSession(req, election.id)) {
        throw createError(409, "You've already voted in this poll. Thanks!");
      }
      if (await hasVotedFromIp(election.id, ipHash)) {
        throw createError(
          409,
          "Looks like a vote was already recorded from this network. If that wasn't you, please ask the poll's admin for help."
        );
      }
    }

    const questions = await Question.findAll({
      where: { electionId: election.id },
      include: [Option],
    });
    const questionMap = new Map(questions.map((q) => [q.id, q]));
    const answeredIds = new Set();

    for (const a of answers) {
      const q = questionMap.get(a.questionId);
      if (!q) throw createError(400, `Unknown question: ${a.questionId}`);
      if (answeredIds.has(a.questionId)) {
        throw createError(400, `Duplicate answer for question ${a.questionId}`);
      }
      answeredIds.add(a.questionId);
      const validOption = q.Options.some((o) => o.id === a.optionId);
      if (!validOption) {
        throw createError(400, `Option ${a.optionId} doesn't belong to question ${q.id}`);
      }
    }

    for (const q of questions) {
      if (q.isRequired && !answeredIds.has(q.id)) {
        throw createError(400, `Required question missing: "${q.title}"`);
      }
    }

    const response = await sequelize.transaction(async (t) => {
      const created = await Response.create(
        {
          electionId: election.id,
          voterId,
          answers,
          ipHash,
        },
        { transaction: t }
      );
      if (voterId) {
        await Voter.update(
          { voted: true },
          { where: { id: voterId }, transaction: t }
        );
      }
      return created;
    });

    // Mark this session as having voted in this poll. Survives reloads
    // and tab closes for the lifetime of the session cookie (24h).
    markVotedInSession(req, election.id);

    const totalResponses = await Response.count({
      where: { electionId: election.id },
    });
    emitResponseNew(election.id, {
      totalResponses,
      newAnswers: answers,
    });

    res.status(201).json({ responseId: response.id });
  } catch (err) {
    next(err);
  }
}

async function getPublishedResults(req, res, next) {
  try {
    const election = req.election;
    if (!election.resultsPublished) throw createError(404, "Results are not published");

    const questions = await Question.findAll({
      where: { electionId: election.id },
      include: [Option],
      order: [
        ["id", "ASC"],
        [Option, "id", "ASC"],
      ],
    });

    const responses = await Response.findAll({
      where: { electionId: election.id },
    });
    const totalResponses = responses.length;

    const tally = new Map();
    for (const r of responses) {
      for (const a of r.answers) {
        const key = `${a.questionId}:${a.optionId}`;
        tally.set(key, (tally.get(key) || 0) + 1);
      }
    }

    const results = questions.map((q) => ({
      id: q.id,
      title: q.title,
      description: q.description,
      options: q.Options.map((o) => ({
        id: o.id,
        label: o.label,
        count: tally.get(`${q.id}:${o.id}`) || 0,
      })),
    }));

    res.json({
      election: {
        name: election.name,
        customUrl: election.customUrl,
        endedAt: election.updatedAt,
      },
      totalResponses,
      results,
    });
  } catch (err) {
    next(err);
  }
}

async function subscribe(req, res, next) {
  try {
    const election = req.election;
    const { email, notifyOn } = req.body;
    const [row, created] = await Subscriber.findOrCreate({
      where: { email, electionId: election.id },
      defaults: { notifyOn },
    });
    if (!created && row.notifyOn !== notifyOn) {
      row.notifyOn = notifyOn;
      await row.save();
    }
    res.status(201).json({
      ok: true,
      alreadySubscribed: !created,
      message: created
        ? "We'll email you when results land."
        : "You're already on the list — we'll be in touch.",
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getBallot,
  voterLogin,
  voterLogout,
  submitResponse,
  getPublishedResults,
  subscribe,
};
