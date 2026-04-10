import { z } from "zod";

const roleValues = ["borrower", "staff", "admin"] as const;

export const userIdParamsSchema = z.object({
  id: z.string().trim().min(1).max(255),
});

export const userListQuerySchema = z.object({
  role: z.enum(roleValues).optional(),
  isActive: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => {
      if (value === undefined) {
        return undefined;
      }

      return value === "true";
    }),
  search: z.string().trim().max(255).optional().default(""),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const userCreateSchema = z.object({
  externalUserId: z.string().trim().min(1).max(255).optional(),
  username: z.string().trim().min(1).max(50),
  password: z.string().min(8).max(255),
  fullName: z.string().trim().min(1).max(255),
  email: z.string().trim().email().max(255).optional(),
  employeeCode: z.string().trim().max(50).optional(),
  department: z.string().trim().max(255).optional(),
  role: z.enum(roleValues).default("borrower"),
  isActive: z.boolean().optional().default(true),
});

export const userUpdateSchema = z
  .object({
    fullName: z.string().trim().min(1).max(255).optional(),
    email: z.string().trim().email().max(255).nullable().optional(),
    employeeCode: z.string().trim().max(50).nullable().optional(),
    department: z.string().trim().max(255).nullable().optional(),
    role: z.enum(roleValues).optional(),
    isActive: z.boolean().optional(),
    password: z.string().min(8).max(255).optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one field must be provided",
  });

export type UserListQuery = z.infer<typeof userListQuerySchema>;
export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
