"use strict";

require("dotenv").config();

const { z } = require("zod");

const cleaned = Object.fromEntries(
  Object.entries(process.env).map(([k, v]) => [k, v === "" ? undefined : v])
);

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  SESSION_SECRET: z.string().min(16),
  CSRF_SECRET: z.string().min(16),
  COOKIE_SECRET: z.string().min(16),
  FRONTEND_ORIGIN: z.string().url().optional(),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),

  GUEST_DEMO_EMAIL: z
    .string()
    .email()
    .default("contact@developedbysaad.com"),
  GUEST_DEMO_PASSWORD: z
    .string()
    .min(1)
    .default("x.com/developedbysaad"),

  BREVO_API_KEY: z.string().optional(),
  BREVO_SENDER_EMAIL: z.string().email().optional(),
  BREVO_SENDER_NAME: z.string().default("Pulse Board"),

  PUBLIC_ORIGIN: z.string().url().optional(),
});

const parsed = schema.safeParse(cleaned);
if (!parsed.success) {
  console.error("Invalid environment configuration:");
  console.error(z.prettifyError(parsed.error));
  process.exit(1);
}

module.exports = Object.freeze(parsed.data);
