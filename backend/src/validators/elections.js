"use strict";

const { z } = require("zod");

// Single source of truth for slug shape. Rules:
//   - lowercase letters, digits, and single dashes
//   - 1–64 chars
//   - must contain at least one alphanumeric (so "---" is rejected)
//   - cannot start or end with a dash
// All four points map cleanly to slugify() output, so a slug produced
// by the slugify lib will always pass this regex.
const slugSchema = z
  .string()
  .min(1, "Slug can't be empty")
  .max(64, "Slug is too long — keep it under 64 characters")
  .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and dashes only")
  .regex(/[a-z0-9]/, "Slug needs at least one letter or number")
  .refine(
    (s) => !s.startsWith("-") && !s.endsWith("-"),
    "Slug can't start or end with a dash"
  );

const idParam = z.object({
  id: z.coerce.number().int().positive(),
});

const customUrlParam = z.object({
  customUrl: slugSchema,
});

const createBody = z.object({
  name: z.string().min(1).max(200),
  mode: z.enum(["authenticated", "anonymous"]).default("authenticated"),
  expiresAt: z.coerce.date().optional().nullable(),
  // Optional — controller auto-generates from `name` if absent.
  customUrl: slugSchema.optional(),
});

const slugAvailableQuery = z.object({
  slug: z.string().min(1).max(64),
  excludeId: z.coerce.number().int().positive().optional(),
});

const updateBody = z
  .object({
    name: z.string().min(1).max(200).optional(),
    mode: z.enum(["authenticated", "anonymous"]).optional(),
    expiresAt: z.coerce.date().nullable().optional(),
    customUrl: slugSchema.optional(),
  })
  .strict();

module.exports = {
  idParam,
  customUrlParam,
  createBody,
  updateBody,
  slugAvailableQuery,
  slugSchema,
};
