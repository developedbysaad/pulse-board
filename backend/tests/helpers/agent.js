"use strict";

const request = require("supertest");

async function csrfFor(agent) {
  const res = await agent.get("/api/auth/csrf-token").expect(200);
  return res.body.csrfToken;
}

function makeAgent(app) {
  const agent = request.agent(app);

  const wrap = (method) => (path, { csrf = null } = {}) => {
    const req = agent[method](path);
    if (csrf) req.set("x-csrf-token", csrf);
    return req;
  };

  return {
    raw: agent,
    get: (path) => agent.get(path),
    post: wrap("post"),
    patch: wrap("patch"),
    delete: wrap("delete"),
    csrfToken: () => csrfFor(agent),
  };
}

module.exports = { makeAgent };
