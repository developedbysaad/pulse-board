"use strict";

const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");

const { Admin, Voter, Election } = require("../models");

passport.use(
  "admin-local",
  new LocalStrategy(
    { usernameField: "email", passwordField: "password" },
    async (email, password, done) => {
      try {
        const admin = await Admin.findOne({ where: { email } });
        if (!admin) return done(null, false, { message: "Invalid credentials" });
        const ok = await bcrypt.compare(password, admin.password);
        if (!ok) return done(null, false, { message: "Invalid credentials" });
        return done(null, { type: "admin", id: admin.id });
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.use(
  "voter-local",
  new LocalStrategy(
    {
      usernameField: "voterId",
      passwordField: "password",
      passReqToCallback: true,
    },
    async (req, voterId, password, done) => {
      try {
        const election = await Election.findOne({
          where: { customUrl: req.params.customUrl },
        });
        if (!election) return done(null, false, { message: "Election not found" });

        const voter = await Voter.findOne({
          where: { voterId, electionId: election.id },
        });
        if (!voter) return done(null, false, { message: "Invalid credentials" });

        const ok = await bcrypt.compare(password, voter.password);
        if (!ok) return done(null, false, { message: "Invalid credentials" });

        return done(null, {
          type: "voter",
          id: voter.id,
          electionId: election.id,
          customUrl: election.customUrl,
        });
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser(async (sessionUser, done) => {
  try {
    if (!sessionUser || !sessionUser.type) return done(null, false);
    if (sessionUser.type === "admin") {
      const admin = await Admin.findByPk(sessionUser.id);
      if (!admin) return done(null, false);
      return done(null, { type: "admin", id: admin.id, name: admin.name, email: admin.email });
    }
    if (sessionUser.type === "voter") {
      const voter = await Voter.findByPk(sessionUser.id);
      if (!voter) return done(null, false);
      return done(null, {
        type: "voter",
        id: voter.id,
        voterId: voter.voterId,
        electionId: voter.electionId,
        customUrl: sessionUser.customUrl,
      });
    }
    return done(null, false);
  } catch (err) {
    done(err);
  }
});

module.exports = passport;
