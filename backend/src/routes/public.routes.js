"use strict";

const express = require("express");
const { validate } = require("../middleware/validate");
const { loadElectionByCustomUrl } = require("../middleware/auth");
const { submitResponseLimiter, authLimiter } = require("../middleware/rateLimit");
const elections = require("../validators/elections");
const auth = require("../validators/auth");
const responses = require("../validators/responses");
const subscribers = require("../validators/subscribers");
const c = require("../controllers/public.controller");

const router = express.Router();

router.get(
  "/elections/:customUrl",
  validate({ params: elections.customUrlParam }),
  loadElectionByCustomUrl,
  c.getBallot
);

router.post(
  "/elections/:customUrl/voter-login",
  authLimiter,
  validate({ params: elections.customUrlParam, body: auth.voterLoginBody }),
  loadElectionByCustomUrl,
  c.voterLogin
);

router.post(
  "/elections/:customUrl/voter-logout",
  validate({ params: elections.customUrlParam }),
  c.voterLogout
);

router.post(
  "/elections/:customUrl/responses",
  submitResponseLimiter,
  validate({ params: elections.customUrlParam, body: responses.submitBody }),
  loadElectionByCustomUrl,
  c.submitResponse
);

router.get(
  "/elections/:customUrl/results",
  validate({ params: elections.customUrlParam }),
  loadElectionByCustomUrl,
  c.getPublishedResults
);

router.post(
  "/elections/:customUrl/subscribe",
  authLimiter,
  validate({
    params: elections.customUrlParam,
    body: subscribers.subscribeBody,
  }),
  loadElectionByCustomUrl,
  c.subscribe
);

module.exports = router;
