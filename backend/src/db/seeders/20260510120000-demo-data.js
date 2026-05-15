"use strict";

require("dotenv").config();
const bcrypt = require("bcrypt");

/**
 * Demo seed — populates a guest admin and five polls covering every
 * lifecycle state, plus realistic Response rows so charts render
 * immediately and the smart "notify me" CTA has somewhere to land.
 *
 * Credentials come from env vars (GUEST_DEMO_EMAIL / GUEST_DEMO_PASSWORD)
 * so this file is safe to commit. Defaults are watermarks, NOT real creds:
 *   contact@developedbysaad.com / x.com/developedbysaad
 *
 *   /e/team-lunch       → live, anonymous, accepts now,    ~62 votes
 *   /e/q1-roadmap       → live, ending tonight,             ~140 votes
 *   /e/town-hall-may    → results PUBLISHED today,          ~287 votes
 *   /e/feature-vote     → ENDED but not yet published,      ~178 votes (CTA target)
 *   /e/the-dev-poll     → authenticated, mid-flight,        ~6 of 10 voted
 */

const GUEST_EMAIL =
  process.env.GUEST_DEMO_EMAIL || "contact@developedbysaad.com";
const GUEST_PASSWORD =
  process.env.GUEST_DEMO_PASSWORD || "x.com/developedbysaad";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function dayAt(offsetDays, hour = 9, min = 0) {
  const d = new Date();
  d.setHours(hour, min, 0, 0);
  return new Date(d.getTime() + offsetDays * DAY);
}

// Deterministic pseudo-random so seeds are reproducible.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function pickWeighted(rand, options) {
  const total = options.reduce((s, o) => s + o.weight, 0);
  let n = rand() * total;
  for (const o of options) {
    if ((n -= o.weight) <= 0) return o.id;
  }
  return options[options.length - 1].id;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    const passwordHash = await bcrypt.hash(GUEST_PASSWORD, 10);

    // --- Admin --------------------------------------------------------
    const [admin] = await queryInterface.bulkInsert(
      "Admins",
      [
        {
          name: "Guest Demo",
          email: GUEST_EMAIL,
          password: passwordHash,
          createdAt: now,
          updatedAt: now,
        },
      ],
      { returning: ["id"] }
    );
    const adminId = admin.id;

    // --- Polls --------------------------------------------------------
    const electionDefs = [
      {
        slug: "team-lunch",
        name: "Where should we go for team lunch this Friday?",
        mode: "anonymous",
        launched: true,
        ended: false,
        resultsPublished: false,
        launchedAt: dayAt(0, 9),
        expiresAt: dayAt(0, 18),
        targetVotes: 62,
        questions: [
          {
            title: "Pick your spot",
            description: "Anywhere within 15 minutes of the office.",
            isRequired: true,
            options: [
              { label: "Sushi Roku · Bandra", weight: 5 },
              { label: "The Hole in the Wall Café", weight: 3 },
              { label: "Bademiya · Colaba", weight: 4 },
              { label: "Order in & extend the meeting", weight: 1 },
            ],
          },
          {
            title: "Cuisine preference",
            isRequired: false,
            options: [
              { label: "Indian", weight: 4 },
              { label: "Asian", weight: 3 },
              { label: "Western", weight: 2 },
              { label: "Surprise us", weight: 1 },
            ],
          },
        ],
      },
      {
        slug: "q1-roadmap",
        name: "Q1 roadmap — which feature should ship first?",
        mode: "anonymous",
        launched: true,
        ended: false,
        resultsPublished: false,
        launchedAt: dayAt(-1, 9),
        expiresAt: dayAt(0, 17),
        targetVotes: 140,
        questions: [
          {
            title: "Top priority for the next sprint",
            description:
              "We can only ship one of these well in six weeks. Pick the one you'd want first.",
            isRequired: true,
            options: [
              { label: "Mobile companion app (iOS + Android)", weight: 6 },
              { label: "Slack + Teams integrations", weight: 4 },
              { label: "Public REST API + webhooks", weight: 3 },
              { label: "Granular permissions / role management", weight: 2 },
              { label: "Custom branded poll pages", weight: 1 },
            ],
          },
          {
            title: "How important is real-time analytics for you?",
            isRequired: true,
            options: [
              { label: "Critical — we watch live", weight: 5 },
              { label: "Nice to have", weight: 3 },
              { label: "I just need final numbers", weight: 2 },
            ],
          },
        ],
      },
      {
        slug: "town-hall-may",
        name: "May Town Hall — direction for the second half",
        mode: "anonymous",
        launched: true,
        ended: true,
        resultsPublished: true,
        launchedAt: dayAt(-3, 9),
        endedAt: dayAt(-1, 17),
        publishedAt: dayAt(0, 9),
        expiresAt: dayAt(-1, 17),
        targetVotes: 287,
        questions: [
          {
            title: "Where should we double down?",
            isRequired: true,
            options: [
              { label: "Improve developer experience", weight: 5 },
              { label: "Grow customer support team", weight: 3 },
              { label: "New geo expansion (EU)", weight: 2 },
              { label: "Maintenance & tech debt", weight: 4 },
            ],
          },
          {
            title: "Office return policy?",
            isRequired: true,
            options: [
              { label: "Fully remote", weight: 7 },
              { label: "2 days in office", weight: 4 },
              { label: "3 days in office", weight: 2 },
              { label: "Full time in office", weight: 1 },
            ],
          },
          {
            title: "Bring back the Friday demo?",
            isRequired: false,
            options: [
              { label: "Yes — every Friday", weight: 6 },
              { label: "Yes — every other Friday", weight: 3 },
              { label: "No, keep async", weight: 2 },
            ],
          },
        ],
      },
      {
        slug: "feature-vote",
        name: "Top requested feature for v2",
        mode: "anonymous",
        launched: true,
        ended: true,
        resultsPublished: false,
        launchedAt: dayAt(-3, 9),
        endedAt: dayAt(-2, 17),
        publishedAt: dayAt(1, 9),
        expiresAt: dayAt(-2, 17),
        targetVotes: 178,
        questions: [
          {
            title: "Pick the one feature you'd use first",
            description:
              "Results announcement at 9am tomorrow. Sign up below to be notified.",
            isRequired: true,
            options: [
              { label: "Multi-question conditional logic", weight: 5 },
              { label: "Live word-cloud (free text questions)", weight: 6 },
              { label: "Result embeds for blog posts", weight: 3 },
              { label: "Anonymous voter audit trail", weight: 2 },
              { label: "Multi-language ballots", weight: 4 },
            ],
          },
        ],
      },
      {
        slug: "the-dev-poll",
        name: "Engineering retro — what do we keep doing?",
        mode: "authenticated",
        launched: true,
        ended: false,
        resultsPublished: false,
        launchedAt: dayAt(0, 10),
        expiresAt: dayAt(2, 17),
        targetVotes: 0, // we'll wire voters individually below
        questions: [
          {
            title: "Best practice we should keep",
            isRequired: true,
            options: [
              { label: "Pair-programming Fridays", weight: 4 },
              { label: "Async standups", weight: 3 },
              { label: "Architecture decision records", weight: 2 },
              { label: "Weekly bug bash", weight: 1 },
            ],
          },
          {
            title: "Worst practice we should drop",
            isRequired: true,
            options: [
              { label: "Long PR descriptions nobody reads", weight: 3 },
              { label: "Mandatory comments in PRs", weight: 2 },
              { label: "Mid-sprint scope creep", weight: 4 },
              { label: "All-day planning meetings", weight: 5 },
            ],
          },
        ],
      },
    ];

    // --- Insert elections + questions + options + responses ----------
    const insertedElections = [];
    for (const def of electionDefs) {
      const created = def.launchedAt || now;
      const updated = def.publishedAt || def.endedAt || created;

      const [erow] = await queryInterface.bulkInsert(
        "Elections",
        [
          {
            name: def.name,
            mode: def.mode,
            launched: def.launched,
            ended: def.ended,
            resultsPublished: def.resultsPublished,
            customUrl: def.slug,
            expiresAt: def.expiresAt || null,
            adminId,
            createdAt: created,
            updatedAt: updated,
          },
        ],
        { returning: ["id"] }
      );
      const electionId = erow.id;
      insertedElections.push({ id: electionId, def });

      const questionInserts = def.questions.map((q) => ({
        title: q.title,
        description: q.description || null,
        isRequired: q.isRequired,
        electionId,
        createdAt: created,
        updatedAt: updated,
      }));
      const insertedQuestions = await queryInterface.bulkInsert(
        "Questions",
        questionInserts,
        { returning: ["id"] }
      );

      const questionsWithOptions = [];
      for (let qi = 0; qi < def.questions.length; qi++) {
        const qDef = def.questions[qi];
        const qid = insertedQuestions[qi].id;
        const optionInserts = qDef.options.map((o) => ({
          label: o.label,
          questionId: qid,
          createdAt: created,
          updatedAt: updated,
        }));
        const insertedOptions = await queryInterface.bulkInsert(
          "Options",
          optionInserts,
          { returning: ["id"] }
        );
        questionsWithOptions.push({
          qid,
          options: insertedOptions.map((o, i) => ({
            id: o.id,
            weight: qDef.options[i].weight,
          })),
        });
      }

      // Seed responses for non-authenticated polls.
      if (def.mode === "anonymous" && def.targetVotes > 0) {
        const rand = rng(electionId * 9973 + 17);
        const responseInserts = [];
        for (let i = 0; i < def.targetVotes; i++) {
          const answers = questionsWithOptions.map(({ qid, options }) => ({
            questionId: qid,
            optionId: pickWeighted(rand, options),
          }));
          // Spread responses across the live window for realistic timestamps.
          const start = (def.launchedAt || created).getTime();
          const end = (def.endedAt || now).getTime();
          const ts = new Date(start + rand() * Math.max(end - start, HOUR));
          responseInserts.push({
            electionId,
            voterId: null,
            answers: JSON.stringify(answers),
            ipHash: null,
            createdAt: ts,
            updatedAt: ts,
          });
        }
        await queryInterface.bulkInsert("Responses", responseInserts);
      }
    }

    // --- Authenticated poll: 10 voters, 6 already voted --------------
    const devPoll = insertedElections.find(
      (e) => e.def.slug === "the-dev-poll"
    );
    if (devPoll) {
      const voterPasswordHash = await bcrypt.hash("vote1234", 10);
      const voters = Array.from({ length: 10 }, (_, i) => ({
        voterId: `dev-${String(i + 1).padStart(2, "0")}`,
        password: voterPasswordHash,
        voted: i < 6,
        electionId: devPoll.id,
        createdAt: now,
        updatedAt: now,
      }));
      const insertedVoters = await queryInterface.bulkInsert("Voters", voters, {
        returning: ["id"],
      });

      // Build their responses.
      const qs = await queryInterface.sequelize.query(
        `SELECT q.id AS qid, o.id AS oid
           FROM "Questions" q JOIN "Options" o ON o."questionId" = q.id
          WHERE q."electionId" = :eid
          ORDER BY q.id, o.id`,
        {
          replacements: { eid: devPoll.id },
          type: queryInterface.sequelize.QueryTypes.SELECT,
        }
      );
      const byQ = new Map();
      for (const row of qs) {
        if (!byQ.has(row.qid)) byQ.set(row.qid, []);
        byQ.get(row.qid).push(row.oid);
      }
      const rand = rng(devPoll.id * 9973);
      const respInserts = [];
      for (let i = 0; i < 6; i++) {
        const answers = [...byQ.entries()].map(([qid, opts]) => ({
          questionId: qid,
          optionId: opts[Math.floor(rand() * opts.length)],
        }));
        const ts = new Date(now.getTime() - Math.floor(rand() * 6 * HOUR));
        respInserts.push({
          electionId: devPoll.id,
          voterId: insertedVoters[i].id,
          answers: JSON.stringify(answers),
          ipHash: null,
          createdAt: ts,
          updatedAt: ts,
        });
      }
      await queryInterface.bulkInsert("Responses", respInserts);
    }

    // --- Seed a couple of subscribers on the ended-but-unpublished poll
    const featureVote = insertedElections.find(
      (e) => e.def.slug === "feature-vote"
    );
    if (featureVote) {
      await queryInterface.bulkInsert("Subscribers", [
        {
          email: "alice@example.com",
          electionId: featureVote.id,
          notifyOn: "results",
          createdAt: now,
          updatedAt: now,
        },
        {
          email: "bob@example.com",
          electionId: featureVote.id,
          notifyOn: "results",
          createdAt: now,
          updatedAt: now,
        },
      ]);
    }
  },

  async down(queryInterface, Sequelize) {
    const { Op } = Sequelize;
    // Cascade handles Questions/Options/Voters/Responses/Subscribers.
    await queryInterface.bulkDelete(
      "Elections",
      {
        customUrl: {
          [Op.in]: [
            "team-lunch",
            "q1-roadmap",
            "town-hall-may",
            "feature-vote",
            "the-dev-poll",
            "demo",
          ],
        },
      },
      {}
    );
    await queryInterface.bulkDelete(
      "Admins",
      {
        email: {
          [Op.in]: [
            GUEST_EMAIL,
            "guest-demo@developedbysaad.com", // legacy
            "demo@local", // legacy
          ],
        },
      },
      {}
    );
  },
};
