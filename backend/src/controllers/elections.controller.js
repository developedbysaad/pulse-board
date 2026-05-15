"use strict";

const createError = require("http-errors");
const { Election, Question, Option, Voter } = require("../models");
const { emitElectionStatus } = require("../sockets/emitters");
const { enforceExpiry } = require("../middleware/auth");
const {
  slugify,
  findAvailableSlug,
  isReserved,
  isAvailable: isSlugAvailable,
} = require("../lib/slug");
const { notifyResultsPublished } = require("../lib/notify");

function statusPayload(election) {
  return {
    launched: election.launched,
    ended: election.ended,
    resultsPublished: election.resultsPublished,
    expiresAt: election.expiresAt,
  };
}

async function list(req, res, next) {
  try {
    const elections = await Election.findAll({
      where: { adminId: req.user.id },
      order: [["createdAt", "DESC"]],
    });
    await Promise.all(elections.map(enforceExpiry));
    res.json({ elections });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const election = await Election.findOne({
      where: { id: req.params.id, adminId: req.user.id },
      include: [
        {
          model: Question,
          include: [Option],
        },
        { model: Voter, attributes: { exclude: ["password"] } },
      ],
      order: [
        [Question, "id", "ASC"],
        [Question, Option, "id", "ASC"],
      ],
    });
    if (!election) throw createError(404, "Election not found");
    res.json({ election });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const {
      name,
      mode = "authenticated",
      expiresAt = null,
      customUrl: requestedSlug,
    } = req.body;

    let customUrl;
    if (requestedSlug) {
      // Admin supplied a slug explicitly — validate it's available.
      // Zod has already enforced shape; we just check uniqueness here.
      const ok = await isSlugAvailable(requestedSlug, Election);
      if (!ok) throw createError(409, "That slug is taken or reserved");
      customUrl = requestedSlug;
    } else {
      // Auto-generate from the title. findAvailableSlug appends -2, -3,
      // … on collision, so two polls named "Team lunch" get clean slugs.
      customUrl = await findAvailableSlug(name, Election);
    }

    const election = await Election.create({
      name,
      mode,
      expiresAt,
      customUrl,
      adminId: req.user.id,
    });
    res.status(201).json({ election });
  } catch (err) {
    next(err);
  }
}

async function slugAvailable(req, res, next) {
  try {
    const { slug, excludeId } = req.query;
    if (!slug) return res.json({ available: false, reason: "empty" });

    const normalised = slugify(slug);
    if (normalised !== slug) {
      // Tell the caller the slug isn't in canonical form so the FE can
      // suggest the canonical version. We don't auto-rewrite — the user
      // typed it, the user gets to confirm.
      return res.json({
        available: false,
        reason: "not-canonical",
        suggestion: normalised || null,
      });
    }
    if (isReserved(slug)) {
      return res.json({
        available: false,
        reason: "reserved",
        suggestion: `${slug}-poll`,
      });
    }

    const ok = await isSlugAvailable(slug, Election, excludeId);
    if (ok) return res.json({ available: true });

    const suggestion = await findAvailableSlug(slug, Election, { excludeId });
    res.json({ available: false, reason: "taken", suggestion });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const election = req.election;
    if (election.launched) {
      const allowedWhenLive = ["expiresAt"];
      const incoming = Object.keys(req.body);
      const blocked = incoming.filter((k) => !allowedWhenLive.includes(k));
      if (blocked.length > 0) {
        throw createError(409, `Cannot change ${blocked.join(", ")} after launch`);
      }
    }

    if (req.body.customUrl) {
      const slug = req.body.customUrl;
      if (slugify(slug) !== slug) {
        throw createError(
          400,
          "Slug must be lowercase letters, numbers, and dashes only"
        );
      }
      if (isReserved(slug)) {
        throw createError(409, "That slug is reserved — pick a different one");
      }
      const ok = await isSlugAvailable(slug, Election, election.id);
      if (!ok) throw createError(409, "That slug is taken");
    }

    await election.update(req.body);
    res.json({ election });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await req.election.destroy();
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

async function launch(req, res, next) {
  try {
    const election = req.election;
    if (election.launched) throw createError(409, "Already launched");
    if (election.ended) throw createError(409, "Election has ended");

    const questions = await Question.findAll({ where: { electionId: election.id } });
    if (questions.length < 1) {
      throw createError(400, "Add at least one question first");
    }
    for (const q of questions) {
      const optCount = await Option.count({ where: { questionId: q.id } });
      if (optCount < 2) {
        throw createError(400, `Question "${q.title}" needs at least two options`);
      }
    }
    if (election.mode === "authenticated") {
      const voterCount = await Voter.count({ where: { electionId: election.id } });
      if (voterCount < 1) {
        throw createError(400, "Authenticated mode requires at least one voter");
      }
    }

    await election.update({ launched: true });
    emitElectionStatus(election.id, statusPayload(election));
    res.json({ election });
  } catch (err) {
    next(err);
  }
}

async function end(req, res, next) {
  try {
    const election = req.election;
    if (!election.launched) throw createError(409, "Not launched yet");
    if (election.ended) throw createError(409, "Already ended");
    await election.update({ ended: true });
    emitElectionStatus(election.id, statusPayload(election));
    res.json({ election });
  } catch (err) {
    next(err);
  }
}

async function publish(req, res, next) {
  try {
    const election = req.election;
    if (!election.ended) throw createError(409, "End the election before publishing");
    if (election.resultsPublished) throw createError(409, "Already published");
    await election.update({ resultsPublished: true });
    emitElectionStatus(election.id, statusPayload(election));

    // Fire-and-forget: a flaky email provider should not block the
    // admin's publish action. The notifier handles its own errors.
    notifyResultsPublished(election.id);

    res.json({ election });
  } catch (err) {
    next(err);
  }
}

async function unpublish(req, res, next) {
  try {
    await req.election.update({ resultsPublished: false });
    emitElectionStatus(req.election.id, statusPayload(req.election));
    res.json({ election: req.election });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  getOne,
  create,
  update,
  remove,
  launch,
  end,
  publish,
  unpublish,
  slugAvailable,
};
