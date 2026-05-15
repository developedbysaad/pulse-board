"use strict";

const { z } = require("zod");

const idParams = z.object({
  electionId: z.coerce.number().int().positive(),
  questionId: z.coerce.number().int().positive(),
});

const electionIdParam = z.object({
  electionId: z.coerce.number().int().positive(),
});

const createBody = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional().nullable(),
  isRequired: z.boolean().optional().default(true),
});

const updateBody = z
  .object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(5000).nullable().optional(),
    isRequired: z.boolean().optional(),
  })
  .strict();

module.exports = { idParams, electionIdParam, createBody, updateBody };
