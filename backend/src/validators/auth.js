"use strict";

const { z } = require("zod");

const signupBody = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const voterLoginBody = z.object({
  voterId: z.string().min(1),
  password: z.string().min(1),
});

const updateProfileBody = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(200).optional(),
});

module.exports = { signupBody, loginBody, voterLoginBody, updateProfileBody };
