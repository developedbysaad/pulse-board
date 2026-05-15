"use strict";

const { app } = require("../../src/app");
const db = require("../../src/models");
const { makeAgent } = require("../helpers/agent");

beforeAll(async () => {
  await db.sequelize.sync({ force: true });
});

afterAll(async () => {
  await db.sequelize.close();
});

describe("auth", () => {
  test("signup creates a session and 201s", async () => {
    const a = makeAgent(app);
    const csrf = await a.csrfToken();
    const res = await a
      .post("/api/auth/signup", { csrf })
      .send({ name: "User A", email: "a@example.com", password: "password123" });
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ type: "admin", email: "a@example.com" });
  });

  test("login + me round-trip", async () => {
    const a = makeAgent(app);
    let csrf = await a.csrfToken();
    await a
      .post("/api/auth/signup", { csrf })
      .send({ name: "User B", email: "b@example.com", password: "password123" })
      .expect(201);

    csrf = await a.csrfToken();
    const login = await a
      .post("/api/auth/login", { csrf })
      .send({ email: "b@example.com", password: "password123" });
    expect(login.status).toBe(200);

    const me = await a.get("/api/auth/me");
    expect(me.body.user.type).toBe("admin");
  });

  test("login rejects wrong password", async () => {
    const a = makeAgent(app);
    let csrf = await a.csrfToken();
    await a
      .post("/api/auth/signup", { csrf })
      .send({ name: "User C", email: "c@example.com", password: "password123" })
      .expect(201);

    const a2 = makeAgent(app);
    csrf = await a2.csrfToken();
    const r = await a2
      .post("/api/auth/login", { csrf })
      .send({ email: "c@example.com", password: "wrong" });
    expect(r.status).toBe(401);
  });

  test("CSRF rejects POST without token", async () => {
    const r = await require("supertest")(app)
      .post("/api/auth/login")
      .send({ email: "x@y.z", password: "no-csrf" });
    expect(r.status).toBe(403);
    expect(r.body.error).toMatch(/CSRF/i);
  });

  test("/api/elections rejects unauthenticated", async () => {
    const r = await require("supertest")(app).get("/api/elections");
    expect(r.status).toBe(401);
  });
});
