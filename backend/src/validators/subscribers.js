"use strict";

const { z } = require("zod");

const subscribeBody = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  notifyOn: z.enum(["results", "all"]).optional().default("results"),
});

module.exports = { subscribeBody };
