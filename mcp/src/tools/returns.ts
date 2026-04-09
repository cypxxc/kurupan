import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { CHARACTER_LIMIT } from "../constants.js";
import { apiFetch, toMcpError } from "../services/api-client.js";
import type { ReturnTransaction } from "../types.js";

export function registerReturnTools(server: McpServer): void {
  server.registerTool(
    "kurupan_list_returns",
    {
      description: "List return transactions. Optionally filter by borrow request ID.",
      inputSchema: z.object({
        borrowRequestId: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Filter by borrow request ID"),
      }),
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async (input) => {
      try {
        const data = await apiFetch<ReturnTransaction[]>("/api/returns", "GET", undefined, {
          borrowRequestId: input.borrowRequestId,
        });
        const text = JSON.stringify(data, null, 2);
        return {
          content: [
            {
              type: "text",
              text:
                text.length > CHARACTER_LIMIT
                  ? text.slice(0, CHARACTER_LIMIT) + "\n\n[Result truncated. Filter by borrowRequestId to narrow results.]"
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
    "kurupan_get_return",
    {
      description: "Get full details of a return transaction including all returned items and their condition.",
      inputSchema: z.object({
        id: z.number().int().positive().describe("Return transaction ID"),
      }),
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async (input) => {
      try {
        const data = await apiFetch<ReturnTransaction>(`/api/returns/${input.id}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toMcpError(err);
      }
    },
  );

  server.registerTool(
    "kurupan_create_return",
    {
      description:
        "Record a return of borrowed items. Use kurupan_get_borrow_request to find borrowRequestItemId values. Requires staff or admin role.",
      inputSchema: z.object({
        borrowRequestId: z
          .number()
          .int()
          .positive()
          .describe("ID of the approved borrow request being returned"),
        returnedAt: z
          .string()
          .datetime()
          .optional()
          .describe("ISO 8601 datetime when items were returned (defaults to now)"),
        note: z.string().max(2000).optional().describe("General note about this return"),
        items: z
          .array(
            z.object({
              borrowRequestItemId: z
                .number()
                .int()
                .positive()
                .describe("ID of the borrow request item being returned"),
              returnQty: z
                .number()
                .int()
                .positive()
                .describe("Quantity being returned (must be ≤ approvedQty)"),
              condition: z
                .enum(["good", "damaged", "lost"])
                .describe("Condition of the returned item"),
              note: z
                .string()
                .max(1000)
                .optional()
                .describe("Note specific to this item"),
            }),
          )
          .min(1)
          .describe("Items being returned in this transaction"),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (input) => {
      try {
        const data = await apiFetch<ReturnTransaction>("/api/returns", "POST", input);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toMcpError(err);
      }
    },
  );

  server.registerTool(
    "kurupan_update_return",
    {
      description: "Update the note on an existing return transaction. Requires staff or admin role.",
      inputSchema: z.object({
        id: z.number().int().positive().describe("Return transaction ID to update"),
        note: z.string().min(1).max(2000).describe("New note for the return transaction"),
      }),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    },
    async ({ id, note }) => {
      try {
        const data = await apiFetch<ReturnTransaction>(`/api/returns/${id}`, "PATCH", { note });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toMcpError(err);
      }
    },
  );
}
