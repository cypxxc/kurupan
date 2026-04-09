import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { CHARACTER_LIMIT } from "../constants.js";
import { apiFetch, toMcpError } from "../services/api-client.js";
import type { Notification } from "../types.js";

export function registerNotificationTools(server: McpServer): void {
  server.registerTool(
    "kurupan_list_notifications",
    {
      description: "List notifications for the current service account user.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async () => {
      try {
        const data = await apiFetch<Notification[]>("/api/notifications");
        const text = JSON.stringify(data, null, 2);
        return {
          content: [
            {
              type: "text",
              text:
                text.length > CHARACTER_LIMIT
                  ? text.slice(0, CHARACTER_LIMIT) + "\n\n[Result truncated.]"
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
    "kurupan_get_unread_count",
    {
      description: "Get the number of unread notifications for the current user.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async () => {
      try {
        const data = await apiFetch<{ count: number }>("/api/notifications/unread-count");
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toMcpError(err);
      }
    },
  );

  server.registerTool(
    "kurupan_mark_notification_read",
    {
      description: "Mark a single notification as read.",
      inputSchema: z.object({
        id: z.number().int().positive().describe("Notification ID to mark as read"),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (input) => {
      try {
        const data = await apiFetch<Notification>(`/api/notifications/${input.id}/read`, "PATCH");
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toMcpError(err);
      }
    },
  );

  server.registerTool(
    "kurupan_mark_all_notifications_read",
    {
      description: "Mark all notifications as read for the current user.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async () => {
      try {
        await apiFetch<void>("/api/notifications/read-all", "PATCH");
        return { content: [{ type: "text", text: "All notifications marked as read." }] };
      } catch (err) {
        return toMcpError(err);
      }
    },
  );
}
