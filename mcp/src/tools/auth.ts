import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { apiFetch, toMcpError } from "../services/api-client.js";
import type { CurrentActor } from "../types.js";

export function registerAuthTools(server: McpServer): void {
  server.registerTool(
    "kurupan_get_current_user",
    {
      description:
        "Get the currently authenticated Kurupan service account user and role.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async () => {
      try {
        const data = await apiFetch<{ user: CurrentActor }>("/api/auth/me");
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toMcpError(err);
      }
    },
  );
}
