"use strict";

const { z } = require("zod");

const idParams = z.object({
  electionId: z.coerce.number().int().positive(),
  questionId: z.coerce.number().int().positive(),
  optionId: z.coerce.number().int().positive().optional(),
});

const createBody = z.object({
  label: z.string().min(1).max(500),
});

const updateBody = z.object({
  label: z.string().min(1).max(500),
});

module.exports = { idParams, createBody, updateBody };
