"use strict";

const express = require("express");
const { validate } = require("../middleware/validate");
const { requireElectionOwner } = require("../middleware/auth");
const v = require("../validators/voters");
const c = require("../controllers/voters.controller");

const router = express.Router({ mergeParams: true });

router.use(requireElectionOwner("electionId"));

router.get("/", c.list);
router.post("/", validate({ body: v.createBody }), c.create);

router.patch(
  "/:voterId",
  validate({ params: v.idParams, body: v.updateBody }),
  c.update
);

router.delete(
  "/:voterId",
  validate({ params: v.idParams }),
  c.remove
);

module.exports = router;
