"use strict";

const env = require("../config/env");
const { invalidCsrfTokenError } = require("./csrf");

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err === invalidCsrfTokenError || err?.code === "EBADCSRFTOKEN") {
    return res.status(403).json({ error: "Invalid CSRF token" });
  }

  const status = err.status || err.statusCode || 500;
  const payload = {
    error: err.expose || status < 500 ? err.message : "Internal server error",
  };
  if (err.details) payload.details = err.details;
  if (env.NODE_ENV !== "production" && status >= 500) payload.stack = err.stack;

  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json(payload);
}

function notFound(req, res, next) {
  const createError = require("http-errors");
  next(createError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

module.exports = { errorHandler, notFound };
