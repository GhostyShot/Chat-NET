import { z } from "zod";

const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,24}$/u, "USERNAME_INVALID_FORMAT");

export const registerSchema = z.object({
  email: z.email().max(320),
  password: z.string().min(8).max(128),
  displayName: z.string().min(2).max(40),
  username: usernameSchema.optional()
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

export const updateProfileSchema = z
  .object({
    displayName: z.string().min(2).max(40).optional(),
    username: usernameSchema.optional()
  })
  .refine((value) => value.displayName !== undefined || value.username !== undefined, {
    message: "PROFILE_UPDATE_EMPTY"
  });