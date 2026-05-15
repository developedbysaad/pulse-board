"use strict";

const { doubleCsrf } = require("csrf-csrf");
const env = require("../config/env");

const {
  doubleCsrfProtection,
  generateCsrfToken,
  invalidCsrfTokenError,
} = doubleCsrf({
  getSecret: () => env.CSRF_SECRET,
  getSessionIdentifier: (req) => req.sessionID || "anonymous",
  cookieName: env.NODE_ENV === "production" ? "__Host-x-csrf-token" : "x-csrf-token",
  cookieOptions: {
    sameSite: "lax",
    path: "/",
    secure: env.NODE_ENV === "production",
    httpOnly: false,
  },
  size: 32,
  ignoredMethods: ["GET", "HEAD", "OPTIONS"],
  getCsrfTokenFromRequest: (req) => req.headers["x-csrf-token"],
});

module.exports = {
  csrfProtection: doubleCsrfProtection,
  generateCsrfToken,
  invalidCsrfTokenError,
};
