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

async function signupAndLogin(email = "owner@test.com") {
  const a = makeAgent(app);
  let csrf = await a.csrfToken();
  await a
    .post("/api/auth/signup", { csrf })
    .send({ name: "Owner", email, password: "password123" });
  return a;
}

describe("elections CRUD + lifecycle", () => {
  test("admin can create and read elections", async () => {
    const a = await signupAndLogin("e1@test.com");
    let csrf = await a.csrfToken();

    const create = await a
      .post("/api/elections", { csrf })
      .send({ name: "Test Poll", mode: "anonymous" });
    expect(create.status).toBe(201);
    expect(create.body.election.mode).toBe("anonymous");
    expect(create.body.election.customUrl).toBeTruthy();

    const list = await a.get("/api/elections");
    expect(list.body.elections).toHaveLength(1);
  });

  test("only the owner can read their election", async () => {
    const a = await signupAndLogin("e2a@test.com");
    let csrf = await a.csrfToken();
    const created = await a
      .post("/api/elections", { csrf })
      .send({ name: "Owned Poll" });
    const eId = created.body.election.id;

    const b = await signupAndLogin("e2b@test.com");
    const r = await b.get(`/api/elections/${eId}`);
    expect(r.status).toBe(403);
  });

  test("anonymous mode submit + analytics", async () => {
    const a = await signupAndLogin("e3@test.com");
    let csrf = await a.csrfToken();

    const created = await a
      .post("/api/elections", { csrf })
      .send({ name: "Anon Poll", mode: "anonymous" });
    const election = created.body.election;
    const eId = election.id;

    csrf = await a.csrfToken();
    const q = await a
      .post(`/api/elections/${eId}/questions`, { csrf })
      .send({ title: "Pick one", isRequired: true });
    const qId = q.body.question.id;

    csrf = await a.csrfToken();
    const o1 = await a
      .post(`/api/elections/${eId}/questions/${qId}/options`, { csrf })
      .send({ label: "A" });
    csrf = await a.csrfToken();
    const o2 = await a
      .post(`/api/elections/${eId}/questions/${qId}/options`, { csrf })
      .send({ label: "B" });

    csrf = await a.csrfToken();
    const launch = await a.post(`/api/elections/${eId}/launch`, { csrf });
    expect(launch.status).toBe(200);

    const visitor = makeAgent(app);
    let vCsrf = await visitor.csrfToken();
    const submit = await visitor
      .post(`/api/public/elections/${election.customUrl}/responses`, { csrf: vCsrf })
      .send({
        answers: [{ questionId: qId, optionId: o1.body.option.id }],
      });
    expect(submit.status).toBe(201);

    const visitor2 = makeAgent(app);
    vCsrf = await visitor2.csrfToken();
    await visitor2
      .post(`/api/public/elections/${election.customUrl}/responses`, { csrf: vCsrf })
      .send({
        answers: [{ questionId: qId, optionId: o2.body.option.id }],
      })
      .expect(201);

    const analytics = await a.get(`/api/elections/${eId}/analytics`);
    expect(analytics.body.totalResponses).toBe(2);
    expect(analytics.body.perQuestion[0].options).toHaveLength(2);
    const totalPerOption = analytics.body.perQuestion[0].options.map((o) => o.count);
    expect(totalPerOption.sort()).toEqual([1, 1]);
  });

  test("required question rejected when missing", async () => {
    const a = await signupAndLogin("e4@test.com");
    let csrf = await a.csrfToken();
    const created = await a
      .post("/api/elections", { csrf })
      .send({ name: "Req Poll", mode: "anonymous" });
    const election = created.body.election;
    const eId = election.id;

    csrf = await a.csrfToken();
    const q = await a
      .post(`/api/elections/${eId}/questions`, { csrf })
      .send({ title: "Required Q", isRequired: true });
    csrf = await a.csrfToken();
    await a
      .post(`/api/elections/${eId}/questions/${q.body.question.id}/options`, { csrf })
      .send({ label: "X" });
    csrf = await a.csrfToken();
    await a
      .post(`/api/elections/${eId}/questions/${q.body.question.id}/options`, { csrf })
      .send({ label: "Y" });

    csrf = await a.csrfToken();
    const q2 = await a
      .post(`/api/elections/${eId}/questions`, { csrf })
      .send({ title: "Optional Q", isRequired: false });
    csrf = await a.csrfToken();
    const opt = await a
      .post(`/api/elections/${eId}/questions/${q2.body.question.id}/options`, { csrf })
      .send({ label: "Z" });

    csrf = await a.csrfToken();
    await a.post(`/api/elections/${eId}/launch`, { csrf }).expect(200);

    const visitor = makeAgent(app);
    const vCsrf = await visitor.csrfToken();
    const r = await visitor
      .post(`/api/public/elections/${election.customUrl}/responses`, { csrf: vCsrf })
      .send({
        answers: [{ questionId: q2.body.question.id, optionId: opt.body.option.id }],
      });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/required/i);
  });

  test("results not exposed until published", async () => {
    const a = await signupAndLogin("e5@test.com");
    let csrf = await a.csrfToken();
    const created = await a
      .post("/api/elections", { csrf })
      .send({ name: "Pub Poll", mode: "anonymous" });
    const customUrl = created.body.election.customUrl;
    const eId = created.body.election.id;

    csrf = await a.csrfToken();
    const q = await a
      .post(`/api/elections/${eId}/questions`, { csrf })
      .send({ title: "Q" });
    csrf = await a.csrfToken();
    await a
      .post(`/api/elections/${eId}/questions/${q.body.question.id}/options`, { csrf })
      .send({ label: "A" });
    csrf = await a.csrfToken();
    await a
      .post(`/api/elections/${eId}/questions/${q.body.question.id}/options`, { csrf })
      .send({ label: "B" });

    csrf = await a.csrfToken();
    await a.post(`/api/elections/${eId}/launch`, { csrf }).expect(200);
    csrf = await a.csrfToken();
    await a.post(`/api/elections/${eId}/end`, { csrf }).expect(200);

    const before = await require("supertest")(app).get(
      `/api/public/elections/${customUrl}/results`
    );
    expect(before.status).toBe(404);

    csrf = await a.csrfToken();
    await a.post(`/api/elections/${eId}/publish`, { csrf }).expect(200);

    const after = await require("supertest")(app).get(
      `/api/public/elections/${customUrl}/results`
    );
    expect(after.status).toBe(200);
    expect(after.body.results).toHaveLength(1);
  });
});
