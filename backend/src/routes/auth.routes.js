"use strict";

const express = require("express");
const { validate } = require("../middleware/validate");
const { requireAdmin } = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimit");
const { generateCsrfToken } = require("../middleware/csrf");
const v = require("../validators/auth");
const c = require("../controllers/auth.controller");

const router = express.Router();

router.get("/csrf-token", (req, res) => {
  req.session.csrfPrimed = true;
  const token = generateCsrfToken(req, res);
  res.json({ csrfToken: token });
});

router.get("/me", c.me);

router.post("/signup", validate({ body: v.signupBody }), c.signup);
router.post("/login", authLimiter, validate({ body: v.loginBody }), c.login);
router.post("/logout", c.logout);

router.post(
  "/forgot-password",
  authLimiter,
  validate({ body: v.forgotPasswordBody }),
  c.forgotPassword
);
router.post(
  "/reset-password",
  authLimiter,
  validate({ body: v.resetPasswordBody }),
  c.resetPassword
);

router.patch(
  "/profile",
  requireAdmin,
  validate({ body: v.updateProfileBody }),
  c.updateProfile
);

module.exports = router;
