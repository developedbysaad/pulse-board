"use strict";

const { z } = require("zod");

const submitBody = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.coerce.number().int().positive(),
        optionId: z.coerce.number().int().positive(),
      })
    )
    .min(1, "At least one answer is required"),
});

module.exports = { submitBody };
