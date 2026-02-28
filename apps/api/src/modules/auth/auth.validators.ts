import { z } from "zod";

export const registerSchema = z.object({
  email: z.email().max(320),
  password: z.string().min(8).max(128),
  displayName: z.string().min(2).max(40)
});

export const loginSchema = z.object({
  email: z.email().max(320),
  password: z.string().min(8).max(128)
});

export const googleSchema = z.object({
  idToken: z.string().min(10),
  displayName: z.string().min(2).max(40).optional()
});

export const forgotPasswordSchema = z.object({
  email: z.email().max(320)
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(8).max(128)
});

export const verifyEmailSchema = z.object({
  token: z.string().min(10)
});