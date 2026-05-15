"use strict";

const express = require("express");
const { validate } = require("../middleware/validate");
const { requireElectionOwner } = require("../middleware/auth");
const v = require("../validators/questions");
const c = require("../controllers/questions.controller");
const optionsRouter = require("./options.routes");

const router = express.Router({ mergeParams: true });

router.use(requireElectionOwner("electionId"));

router.get("/", c.list);
router.post("/", validate({ body: v.createBody }), c.create);

router.patch(
  "/:questionId",
  validate({ params: v.idParams, body: v.updateBody }),
  c.update
);

router.delete(
  "/:questionId",
  validate({ params: v.idParams }),
  c.remove
);

router.use("/:questionId/options", optionsRouter);

module.exports = router;
