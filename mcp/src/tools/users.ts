import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { CHARACTER_LIMIT } from "../constants.js";
import { apiFetch, toMcpError } from "../services/api-client.js";
import type { User } from "../types.js";

export function registerUserTools(server: McpServer): void {
  server.registerTool(
    "kurupan_list_users",
    {
      description: "List users in the system. Supports filtering by role, active status, and search text. Requires staff or admin role.",
      inputSchema: z.object({
        role: z
          .enum(["borrower", "staff", "admin"])
          .optional()
          .describe("Filter by role"),
        isActive: z
          .boolean()
          .optional()
          .describe("Filter by active status"),
        search: z
          .string()
          .max(255)
          .optional()
          .describe("Search by username, full name, email, or employee code"),
      }),
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async (input) => {
      try {
        const data = await apiFetch<User[]>("/api/users", "GET", undefined, {
          role: input.role,
          isActive: input.isActive !== undefined ? String(input.isActive) : undefined,
          search: input.search,
        });
        const text = JSON.stringify(data, null, 2);
        return {
          content: [
            {
              type: "text",
              text:
                text.length > CHARACTER_LIMIT
                  ? text.slice(0, CHARACTER_LIMIT) + "\n\n[Result truncated. Use filters to narrow results.]"
                  : text,
            },
          ],
        };
      } catch (err) {
        return toMcpError(err);
      }
    },
  );

  server.registerTool(
    "kurupan_get_user",
    {
      description: "Get details of a user by their externalUserId. Requires staff or admin role.",
      inputSchema: z.object({
        id: z.string().min(1).max(255).describe("User's externalUserId"),
      }),
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async (input) => {
      try {
        const data = await apiFetch<User>(`/api/users/${encodeURIComponent(input.id)}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toMcpError(err);
      }
    },
  );

  server.registerTool(
    "kurupan_create_user",
    {
      description: "Create a new local authentication user. Requires admin role.",
      inputSchema: z.object({
        username: z.string().min(1).max(50).describe("Login username"),
        password: z.string().min(8).max(255).describe("Initial password (min 8 characters)"),
        fullName: z.string().min(1).max(255).describe("Full name"),
        email: z.string().email().max(255).optional().describe("Email address"),
        employeeCode: z.string().max(50).optional().describe("Employee/staff code"),
        department: z.string().max(255).optional().describe("Department name"),
        role: z.enum(["borrower", "staff", "admin"]).optional().describe("Role (default: borrower)"),
        isActive: z.boolean().optional().describe("Active status (default: true)"),
        externalUserId: z
          .string()
          .min(1)
          .max(255)
          .optional()
          .describe("External user ID (auto-generated if omitted)"),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (input) => {
      try {
        const data = await apiFetch<User>("/api/users", "POST", input);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toMcpError(err);
      }
    },
  );

  server.registerTool(
    "kurupan_update_user",
    {
      description:
        "Update a user's profile, role, active status, or password. Requires admin role.",
      inputSchema: z.object({
        id: z.string().min(1).max(255).describe("User's externalUserId"),
        fullName: z.string().min(1).max(255).optional().describe("New full name"),
        email: z.string().email().max(255).nullable().optional().describe("New email (null to clear)"),
        employeeCode: z.string().max(50).nullable().optional().describe("New employee code (null to clear)"),
        department: z.string().max(255).nullable().optional().describe("New department (null to clear)"),
        role: z.enum(["borrower", "staff", "admin"]).optional().describe("New role"),
        isActive: z.boolean().optional().describe("New active status"),
        password: z.string().min(8).max(255).optional().describe("New password"),
      }),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    },
    async ({ id, ...fields }) => {
      try {
        const data = await apiFetch<User>(`/api/users/${encodeURIComponent(id)}`, "PATCH", fields);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toMcpError(err);
      }
    },
  );
}
