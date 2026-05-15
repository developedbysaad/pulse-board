"use strict";

const path = require("path");
const express = require("express");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const session = require("express-session");

const env = require("./config/env");
const passport = require("./auth/passport");
const { csrfProtection } = require("./middleware/csrf");
const { errorHandler, notFound } = require("./middleware/error");

const authRouter = require("./routes/auth.routes");
const electionsRouter = require("./routes/elections.routes");
const publicRouter = require("./routes/public.routes");

const app = express();

app.set("trust proxy", 1);

app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser(env.COOKIE_SECRET));

const sessionMiddleware = session({
  name: "pulse.sid",
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    maxAge: 24 * 60 * 60 * 1000,
  },
});
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

app.use(csrfProtection);

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/elections", electionsRouter);
app.use("/api/public", publicRouter);

if (env.NODE_ENV === "production") {
  const frontendDist = path.resolve(__dirname, "..", "..", "frontend", "dist");
  const docsDist = path.resolve(__dirname, "..", "..", "docs", "dist");

  app.use("/docs", express.static(docsDist, { fallthrough: false }));
  app.use(express.static(frontendDist));
  app.get(/^(?!\/(api|docs)\/).*/, (req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

app.use(notFound);
app.use(errorHandler);

module.exports = { app, sessionMiddleware };
