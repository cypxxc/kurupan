import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { CHARACTER_LIMIT } from "../constants.js";
import { apiFetch, toMcpError } from "../services/api-client.js";
import type { AuditLogEntry, HistoryEvent } from "../types.js";

const historyEntityTypeSchema = z.enum([
  "asset",
  "borrow_request",
  "return_transaction",
  "user",
]);

const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .describe("Date in YYYY-MM-DD format");

export function registerHistoryTools(server: McpServer): void {
  server.registerTool(
    "kurupan_list_history",
    {
      description:
        "List human-readable history events across assets, borrow requests, returns, and users.",
      inputSchema: z.object({
        entityType: historyEntityTypeSchema.optional().describe("Filter by entity type"),
        entityId: z.string().min(1).max(255).optional().describe("Filter by entity ID"),
        action: z.string().min(1).max(100).optional().describe("Filter by action code"),
        dateFrom: dateStringSchema.optional(),
        dateTo: dateStringSchema.optional(),
      }),
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async (input) => {
      try {
        const data = await apiFetch<HistoryEvent[]>("/api/history", "GET", undefined, input);
        const text = JSON.stringify(data, null, 2);
        return {
          content: [
            {
              type: "text",
              text:
                text.length > CHARACTER_LIMIT
                  ? text.slice(0, CHARACTER_LIMIT) + "\n\n[Result truncated. Add filters to narrow results.]"
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
        "List raw audit log entries. Requires staff or admin role in the Kurupan app.",
      inputSchema: z.object({
        entityType: historyEntityTypeSchema.optional().describe("Filter by entity type"),
        entityId: z.string().min(1).max(255).optional().describe("Filter by entity ID"),
        action: z.string().min(1).max(100).optional().describe("Filter by action code"),
        dateFrom: dateStringSchema.optional(),
        dateTo: dateStringSchema.optional(),
      }),
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async (input) => {
      try {
        const data = await apiFetch<AuditLogEntry[]>(
          "/api/audit-logs",
          "GET",
          undefined,
          input,
        );
        const text = JSON.stringify(data, null, 2);
        return {
          content: [
            {
              type: "text",
              text:
                text.length > CHARACTER_LIMIT
                  ? text.slice(0, CHARACTER_LIMIT) + "\n\n[Result truncated. Add filters to narrow results.]"
                  : text,
            },
          ],
        };
      } catch (err) {
        return toMcpError(err);
      }
    },
  );
}
