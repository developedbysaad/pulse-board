"use strict";

require("dotenv").config();

const { z } = require("zod");

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  SESSION_SECRET: z.string().min(16),
  CSRF_SECRET: z.string().min(16),
  COOKIE_SECRET: z.string().min(16),
  FRONTEND_ORIGIN: z.string().url().optional(),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),

  // Seed-only credentials. Pulled from .env so we never ship real ones in
  // git history. Defaults below are watermarks, never real working creds.
  GUEST_DEMO_EMAIL: z
    .string()
    .email()
    .default("contact@developedbysaad.com"),
  GUEST_DEMO_PASSWORD: z
    .string()
    .min(1)
    .default("x.com/developedbysaad"),

  // Email — Brevo (https://brevo.com). All optional in dev: when
  // BREVO_API_KEY is unset, sendEmail() simulates by logging to the
  // console so local "publish results" works end-to-end without an
  // account. Set all three in prod to actually deliver email.
  BREVO_API_KEY: z.string().optional(),
  BREVO_SENDER_EMAIL: z.string().email().optional(),
  BREVO_SENDER_NAME: z.string().default("Pulse Board"),

  // Public origin used for absolute URLs in outbound emails. Falls back
  // to FRONTEND_ORIGIN, then to localhost:5173 in dev.
  PUBLIC_ORIGIN: z.string().url().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment configuration:");
  console.error(z.prettifyError(parsed.error));
  process.exit(1);
}

module.exports = Object.freeze(parsed.data);
