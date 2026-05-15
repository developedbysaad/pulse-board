"use strict";

const crypto = require("crypto");
const bcrypt = require("bcrypt");
const createError = require("http-errors");
const passport = require("../auth/passport");
const { Admin, PasswordReset } = require("../models");
const { sendPasswordResetEmail } = require("../lib/notify");

const SALT_ROUNDS = 10;
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;

function hashToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

async function signup(req, res, next) {
  try {
    const { name, email, password } = req.body;
    const existing = await Admin.findOne({ where: { email } });
    if (existing) throw createError(409, "Email already registered");

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const admin = await Admin.create({ name, email, password: hashed });

    req.login({ type: "admin", id: admin.id }, (err) => {
      if (err) return next(err);
      return res.status(201).json({ user: { type: "admin", id: admin.id, name: admin.name, email: admin.email } });
    });
  } catch (err) {
    next(err);
  }
}

function login(req, res, next) {
  passport.authenticate("admin-local", (err, user, info) => {
    if (err) return next(err);
    if (!user) return next(createError(401, info?.message || "Invalid credentials"));
    req.login(user, (loginErr) => {
      if (loginErr) return next(loginErr);
      return res.json({ user: req.user });
    });
  })(req, res, next);
}

function logout(req, res, next) {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy((destroyErr) => {
      if (destroyErr) return next(destroyErr);
      res.clearCookie("connect.sid");
      res.status(204).end();
    });
  });
}

function me(req, res) {
  if (!req.user) return res.json({ user: null });
  res.json({ user: req.user });
}

async function updateProfile(req, res, next) {
  try {
    const admin = await Admin.findByPk(req.user.id);
    if (!admin) throw createError(404, "Admin not found");

    const { name, email, password } = req.body;
    const updates = { name, email };
    if (password) updates.password = await bcrypt.hash(password, SALT_ROUNDS);

    await admin.update(updates);
    res.json({ user: { type: "admin", id: admin.id, name: admin.name, email: admin.email } });
  } catch (err) {
    next(err);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const admin = await Admin.findOne({ where: { email } });

    if (admin) {
      await PasswordReset.update(
        { usedAt: new Date() },
        { where: { adminId: admin.id, usedAt: null } }
      );

      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

      await PasswordReset.create({ adminId: admin.id, tokenHash, expiresAt });

      sendPasswordResetEmail({ admin, rawToken, expiresAt }).catch((err) =>
        console.error("[auth] password-reset email failed:", err?.message || err)
      );
    }

    res.json({
      ok: true,
      message:
        "If an account exists for that email, a reset link is on its way.",
    });
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    const tokenHash = hashToken(token);

    const record = await PasswordReset.findOne({ where: { tokenHash } });
    if (!record || !record.isUsable()) {
      throw createError(400, "Reset link is invalid or has expired");
    }

    const admin = await Admin.findByPk(record.adminId);
    if (!admin) throw createError(400, "Reset link is invalid or has expired");

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    await admin.update({ password: hashed });
    await record.update({ usedAt: new Date() });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  signup,
  login,
  logout,
  me,
  updateProfile,
  forgotPassword,
  resetPassword,
};
