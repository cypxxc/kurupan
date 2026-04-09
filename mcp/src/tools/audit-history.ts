import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { CHARACTER_LIMIT } from "../constants.js";
import { apiFetch, toMcpError } from "../services/api-client.js";
import type { AuditLog } from "../types.js";

export function registerAuditHistoryTools(server: McpServer): void {
  server.registerTool(
    "kurupan_list_history",
    {
      description:
        "Get activity history — a human-readable log of actions taken in the system. Requires staff or admin role.",
      inputSchema: z.object({
        entityType: z
          .string()
          .optional()
          .describe("Filter by entity type (e.g. 'asset', 'borrow_request', 'return_transaction')"),
        entityId: z.string().optional().describe("Filter by entity ID"),
        action: z.string().optional().describe("Filter by action name (e.g. 'borrow_request.create')"),
        dateFrom: z
          .string()
          .datetime()
          .optional()
          .describe("ISO 8601 datetime — show entries from this date/time"),
        dateTo: z
          .string()
          .datetime()
          .optional()
          .describe("ISO 8601 datetime — show entries up to this date/time"),
      }),
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async (input) => {
      try {
        const data = await apiFetch<unknown[]>("/api/history", "GET", undefined, {
          entityType: input.entityType,
          entityId: input.entityId,
          action: input.action,
          dateFrom: input.dateFrom,
          dateTo: input.dateTo,
        });
        const text = JSON.stringify(data, null, 2);
        return {
          content: [
            {
              type: "text",
              text:
                text.length > CHARACTER_LIMIT
                  ? text.slice(0, CHARACTER_LIMIT) + "\n\n[Result truncated. Use filters (entityType, entityId, dateFrom, dateTo) to narrow results.]"
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
    "kurupan_list_audit_logs",
    {
      description:
        "Get raw audit logs with before/after data snapshots for every mutation. Requires staff or admin role.",
      inputSchema: z.object({
        entityType: z.string().optional().describe("Filter by entity type"),
        entityId: z.string().optional().describe("Filter by entity ID"),
        action: z.string().optional().describe("Filter by action name"),
        dateFrom: z.string().datetime().optional().describe("ISO 8601 datetime — from"),
        dateTo: z.string().datetime().optional().describe("ISO 8601 datetime — to"),
      }),
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async (input) => {
      try {
        const data = await apiFetch<AuditLog[]>("/api/audit-logs", "GET", undefined, {
          entityType: input.entityType,
          entityId: input.entityId,
          action: input.action,
          dateFrom: input.dateFrom,
          dateTo: input.dateTo,
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
    "kurupan_whoami",
    {
      description: "Get the identity and role of the currently authenticated service account.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async () => {
      try {
        const data = await apiFetch<unknown>("/api/auth/me");
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toMcpError(err);
      }
    },
  );
}
