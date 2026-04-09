import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { apiFetch, toMcpError } from "../services/api-client.js";
import type { AssetCodeSeries } from "../types.js";

export function registerAssetCodeSeriesTools(server: McpServer): void {
  server.registerTool(
    "kurupan_list_asset_code_series",
    {
      description: "List all asset code series configurations used for auto-generating asset codes (e.g. LAPTOP-0001).",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async () => {
      try {
        const data = await apiFetch<AssetCodeSeries[]>("/api/asset-code-series");
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toMcpError(err);
      }
    },
  );

  server.registerTool(
    "kurupan_get_asset_code_series",
    {
      description: "Get details of a single asset code series including current counter value.",
      inputSchema: z.object({
        id: z.number().int().positive().describe("Asset code series ID"),
      }),
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async (input) => {
      try {
        const data = await apiFetch<AssetCodeSeries>(`/api/asset-code-series/${input.id}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toMcpError(err);
      }
    },
  );

  server.registerTool(
    "kurupan_create_asset_code_series",
    {
      description:
        "Create a new asset code series. Example: prefix=LAPTOP, separator=-, padLength=4 generates codes like LAPTOP-0001.",
      inputSchema: z.object({
        name: z.string().min(1).max(100).describe("Display name for this series"),
        prefix: z.string().min(1).max(20).describe("Code prefix (e.g. LAPTOP, PROJ, CAM)"),
        separator: z
          .string()
          .min(1)
          .max(5)
          .optional()
          .describe("Separator between prefix and number (default: -)"),
        padLength: z
          .number()
          .int()
          .min(1)
          .max(12)
          .optional()
          .describe("Zero-pad length for the number (default: 4 → 0001)"),
        description: z.string().max(255).optional().describe("Description of this series"),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (input) => {
      try {
        const data = await apiFetch<AssetCodeSeries>("/api/asset-code-series", "POST", input);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toMcpError(err);
      }
    },
  );

  server.registerTool(
    "kurupan_update_asset_code_series",
    {
      description: "Update an asset code series. Only provided fields are changed.",
      inputSchema: z.object({
        id: z.number().int().positive().describe("Asset code series ID to update"),
        name: z.string().min(1).max(100).optional().describe("New display name"),
        prefix: z.string().min(1).max(20).optional().describe("New prefix"),
        separator: z.string().min(1).max(5).optional().describe("New separator"),
        padLength: z.number().int().min(1).max(12).optional().describe("New pad length"),
        description: z.string().max(255).nullable().optional().describe("New description (null to clear)"),
      }),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    },
    async ({ id, ...fields }) => {
      try {
        const data = await apiFetch<AssetCodeSeries>(`/api/asset-code-series/${id}`, "PATCH", fields);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toMcpError(err);
      }
    },
  );

  server.registerTool(
    "kurupan_delete_asset_code_series",
    {
      description: "Delete an asset code series. Will fail if assets are using this series.",
      inputSchema: z.object({
        id: z.number().int().positive().describe("Asset code series ID to delete"),
      }),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    },
    async (input) => {
      try {
        await apiFetch<void>(`/api/asset-code-series/${input.id}`, "DELETE");
        return { content: [{ type: "text", text: `Asset code series ${input.id} deleted successfully.` }] };
      } catch (err) {
        return toMcpError(err);
      }
    },
  );
}
