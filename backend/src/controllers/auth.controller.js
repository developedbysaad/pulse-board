"use strict";

const bcrypt = require("bcrypt");
const createError = require("http-errors");
const passport = require("../auth/passport");
const { Admin } = require("../models");

const SALT_ROUNDS = 10;

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

module.exports = { signup, login, logout, me, updateProfile };
