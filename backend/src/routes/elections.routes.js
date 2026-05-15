"use strict";

const express = require("express");
const { validate } = require("../middleware/validate");
const { requireAdmin, requireElectionOwner } = require("../middleware/auth");
const v = require("../validators/elections");
const c = require("../controllers/elections.controller");
const analytics = require("../controllers/analytics.controller");
const questions = require("./questions.routes");
const voters = require("./voters.routes");

const router = express.Router();

router.use(requireAdmin);

router.get("/", c.list);
router.post("/", validate({ body: v.createBody }), c.create);

// Slug availability check — must come BEFORE /:id so the literal path
// segment doesn't get matched by the id-param route.
router.get(
  "/slug-available",
  validate({ query: v.slugAvailableQuery }),
  c.slugAvailable
);

router.get(
  "/:id",
  validate({ params: v.idParam }),
  requireElectionOwner("id"),
  c.getOne
);

router.patch(
  "/:id",
  validate({ params: v.idParam, body: v.updateBody }),
  requireElectionOwner("id"),
  c.update
);

router.delete(
  "/:id",
  validate({ params: v.idParam }),
  requireElectionOwner("id"),
  c.remove
);

router.post(
  "/:id/launch",
  validate({ params: v.idParam }),
  requireElectionOwner("id"),
  c.launch
);

router.post(
  "/:id/end",
  validate({ params: v.idParam }),
  requireElectionOwner("id"),
  c.end
);

router.post(
  "/:id/publish",
  validate({ params: v.idParam }),
  requireElectionOwner("id"),
  c.publish
);

router.post(
  "/:id/unpublish",
  validate({ params: v.idParam }),
  requireElectionOwner("id"),
  c.unpublish
);

router.get(
  "/:id/analytics",
  validate({ params: v.idParam }),
  requireElectionOwner("id"),
  analytics.summary
);

router.use("/:electionId/questions", questions);
router.use("/:electionId/voters", voters);

module.exports = router;
