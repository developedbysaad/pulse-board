"use strict";

const express = require("express");
const { validate } = require("../middleware/validate");
const v = require("../validators/options");
const c = require("../controllers/options.controller");

const router = express.Router({ mergeParams: true });

router.get("/", c.list);
router.post("/", validate({ body: v.createBody }), c.create);

router.patch(
  "/:optionId",
  validate({ params: v.idParams, body: v.updateBody }),
  c.update
);

router.delete(
  "/:optionId",
  validate({ params: v.idParams }),
  c.remove
);

module.exports = router;
