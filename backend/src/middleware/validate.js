"use strict";

const createError = require("http-errors");
const { z } = require("zod");

function formatIssues(error) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

// Express 5 made `req.query` a read-only getter (and stricter on a few
// other fields), so a plain `req.query = parsed` throws. Swap in the
// Zod-parsed (and coerced) value via Object.defineProperty so downstream
// middleware still gets `req.query` / `req.body` / `req.params` as
// normal — just with the validated shape.
function setRequestField(req, key, value) {
  Object.defineProperty(req, key, {
    value,
    writable: true,
    configurable: true,
    enumerable: true,
  });
}

function validate({ body, params, query } = {}) {
  return (req, res, next) => {
    try {
      if (body) setRequestField(req, "body", body.parse(req.body));
      if (params) setRequestField(req, "params", params.parse(req.params));
      if (query) setRequestField(req, "query", query.parse(req.query));
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        return next(
          createError(400, "Validation failed", { details: formatIssues(err) })
        );
      }
      next(err);
    }
  };
}

module.exports = { validate };
