"use strict";

const { z } = require("zod");

const idParams = z.object({
  electionId: z.coerce.number().int().positive(),
  voterId: z.coerce.number().int().positive().optional(),
});

const createBody = z.object({
  voterId: z.string().min(1).max(100),
  password: z.string().min(4).max(200),
});

const updateBody = z
  .object({
    voterId: z.string().min(1).max(100).optional(),
    password: z.string().min(4).max(200).optional(),
  })
  .strict();

module.exports = { idParams, createBody, updateBody };
