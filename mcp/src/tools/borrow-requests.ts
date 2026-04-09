import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { CHARACTER_LIMIT } from "../constants.js";
import { apiFetch, toMcpError } from "../services/api-client.js";
import type { BorrowRequest } from "../types.js";

export function registerBorrowRequestTools(server: McpServer): void {
  server.registerTool(
    "kurupan_list_borrow_requests",
    {
      description:
        "List borrow requests. Staff/admin see all requests; borrowers see only their own. Filter by status or borrower.",
      inputSchema: z.object({
        status: z
          .enum(["pending", "approved", "rejected", "cancelled", "partially_returned", "returned"])
          .optional()
          .describe("Filter by request status"),
        borrower: z
          .string()
          .max(255)
          .optional()
          .describe("Filter by borrower's externalUserId"),
      }),
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async (input) => {
      try {
        const data = await apiFetch<BorrowRequest[]>("/api/borrow-requests", "GET", undefined, {
          status: input.status,
          borrower: input.borrower,
        });
        const text = JSON.stringify(data, null, 2);
        return {
          content: [
            {
              type: "text",
              text:
                text.length > CHARACTER_LIMIT
                  ? text.slice(0, CHARACTER_LIMIT) + "\n\n[Result truncated. Use status or borrower filters to narrow results.]"
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
    "kurupan_get_borrow_request",
    {
      description: "Get full details of a single borrow request including all items and approval/rejection info.",
      inputSchema: z.object({
        id: z.number().int().positive().describe("Borrow request ID"),
      }),
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async (input) => {
      try {
        const data = await apiFetch<BorrowRequest>(`/api/borrow-requests/${input.id}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toMcpError(err);
      }
    },
  );

  server.registerTool(
    "kurupan_create_borrow_request",
    {
      description:
        "Create a new borrow request. Any authenticated user can create a request. Use kurupan_list_assets to find asset IDs.",
      inputSchema: z.object({
        purpose: z.string().min(1).max(2000).describe("Reason for borrowing"),
        startDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .describe("Start date in YYYY-MM-DD format"),
        dueDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .describe("Due/return date in YYYY-MM-DD format (must be >= startDate)"),
        items: z
          .array(
            z.object({
              assetId: z.number().int().positive().describe("Asset ID from kurupan_list_assets"),
              requestedQty: z.number().int().positive().describe("Quantity to borrow"),
            }),
          )
          .min(1)
          .describe("List of assets to borrow (each asset can appear only once)"),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (input) => {
      try {
        const data = await apiFetch<BorrowRequest>("/api/borrow-requests", "POST", input);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toMcpError(err);
      }
    },
  );

  server.registerTool(
    "kurupan_approve_borrow_request",
    {
      description:
        "Approve a pending borrow request. Optionally specify per-item approvedQty for partial approval. Requires staff or admin role.",
      inputSchema: z.object({
        id: z.number().int().positive().describe("Borrow request ID to approve"),
        items: z
          .array(
            z.object({
              borrowRequestItemId: z.number().int().positive().describe("Item ID from the borrow request"),
              approvedQty: z.number().int().positive().describe("Quantity to approve (≤ requestedQty)"),
            }),
          )
          .optional()
          .describe(
            "Per-item approval quantities. Omit to approve all items at their full requested quantities.",
          ),
      }),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    },
    async ({ id, items }) => {
      try {
        const data = await apiFetch<BorrowRequest>(
          `/api/borrow-requests/${id}/approve`,
          "POST",
          items ? { items } : {},
        );
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toMcpError(err);
      }
    },
  );

  server.registerTool(
    "kurupan_reject_borrow_request",
    {
      description: "Reject a pending borrow request with an optional reason. Requires staff or admin role.",
      inputSchema: z.object({
        id: z.number().int().positive().describe("Borrow request ID to reject"),
        rejectionReason: z
          .string()
          .max(2000)
          .optional()
          .describe("Optional reason for rejection"),
      }),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    },
    async ({ id, rejectionReason }) => {
      try {
        const data = await apiFetch<BorrowRequest>(
          `/api/borrow-requests/${id}/reject`,
          "POST",
          { rejectionReason },
        );
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toMcpError(err);
      }
    },
  );

  server.registerTool(
    "kurupan_cancel_borrow_request",
    {
      description: "Cancel a borrow request with an optional reason.",
      inputSchema: z.object({
        id: z.number().int().positive().describe("Borrow request ID to cancel"),
        cancelReason: z
          .string()
          .max(2000)
          .optional()
          .describe("Optional reason for cancellation"),
      }),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    },
    async ({ id, cancelReason }) => {
      try {
        const data = await apiFetch<BorrowRequest>(
          `/api/borrow-requests/${id}/cancel`,
          "POST",
          { cancelReason },
        );
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toMcpError(err);
      }
    },
  );
}
