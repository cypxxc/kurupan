import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { CHARACTER_LIMIT } from "../constants.js";
import { apiFetch, toMcpError } from "../services/api-client.js";
import type { Asset } from "../types.js";

export function registerAssetTools(server: McpServer): void {
  server.registerTool(
    "kurupan_list_assets",
    {
      description:
        "List assets in the Kurupan system. Supports filtering by search text, category, location, and status.",
      inputSchema: z.object({
        search: z.string().max(100).optional().describe("Full-text search across asset code and name"),
        category: z.string().max(100).optional().describe("Filter by category (exact match)"),
        location: z.string().max(255).optional().describe("Filter by location (exact match)"),
        status: z.enum(["available", "maintenance", "retired"]).optional().describe("Filter by asset status"),
      }),
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async (input) => {
      try {
        const data = await apiFetch<Asset[]>("/api/assets", "GET", undefined, {
          search: input.search,
          category: input.category,
          location: input.location,
          status: input.status,
        });
        const text = JSON.stringify(data, null, 2);
        return {
          content: [
            {
              type: "text",
              text: text.length > CHARACTER_LIMIT
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
    "kurupan_get_asset",
    {
      description: "Get full details of a single asset including images and recent activity.",
      inputSchema: z.object({
        id: z.number().int().positive().describe("Asset ID"),
      }),
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async (input) => {
      try {
        const data = await apiFetch<Asset>(`/api/assets/${input.id}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toMcpError(err);
      }
    },
  );

  server.registerTool(
    "kurupan_create_asset",
    {
      description:
        "Create a new asset. Note: image upload is not supported via MCP — use the web UI to add images.",
      inputSchema: z.object({
        assetCode: z.string().min(1).max(50).describe("Unique asset code (e.g. LAPTOP-0001)"),
        name: z.string().min(1).max(255).describe("Asset name (max 10 words)"),
        totalQty: z.number().int().min(0).describe("Total quantity"),
        availableQty: z.number().int().min(0).optional().describe("Available quantity (defaults to totalQty)"),
        category: z.string().max(100).optional().describe("Category label"),
        description: z.string().max(2000).optional().describe("Description"),
        location: z.string().max(2000).optional().describe("Storage location"),
        status: z.enum(["available", "maintenance", "retired"]).optional().describe("Asset status (default: available)"),
        assetCodeSeriesId: z.number().int().positive().optional().describe("Asset code series ID to associate"),
        purchasePrice: z.number().positive().optional().describe("Purchase price"),
        purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Purchase date YYYY-MM-DD"),
        usefulLifeYears: z.number().int().positive().optional().describe("Useful life in years (for depreciation)"),
        residualValue: z.number().positive().optional().describe("Residual/salvage value"),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (input) => {
      try {
        const data = await apiFetch<Asset>("/api/assets", "POST", input);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toMcpError(err);
      }
    },
  );

  server.registerTool(
    "kurupan_update_asset",
    {
      description: "Update an existing asset's fields. Only provided fields will be updated.",
      inputSchema: z.object({
        id: z.number().int().positive().describe("Asset ID to update"),
        assetCode: z.string().min(1).max(50).optional().describe("New asset code"),
        name: z.string().min(1).max(255).optional().describe("New name"),
        totalQty: z.number().int().min(0).optional().describe("New total quantity"),
        availableQty: z.number().int().min(0).optional().describe("New available quantity"),
        category: z.string().max(100).nullable().optional().describe("Category (null to clear)"),
        description: z.string().max(2000).nullable().optional().describe("Description (null to clear)"),
        location: z.string().max(2000).nullable().optional().describe("Location (null to clear)"),
        status: z.enum(["available", "maintenance", "retired"]).optional().describe("New status"),
        assetCodeSeriesId: z.number().int().positive().nullable().optional().describe("Series ID (null to clear)"),
        purchasePrice: z.number().positive().nullable().optional(),
        purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
        usefulLifeYears: z.number().int().positive().nullable().optional(),
        residualValue: z.number().positive().nullable().optional(),
      }),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    },
    async ({ id, ...fields }) => {
      try {
        const data = await apiFetch<Asset>(`/api/assets/${id}`, "PATCH", fields);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toMcpError(err);
      }
    },
  );

  server.registerTool(
    "kurupan_delete_asset",
    {
      description:
        "Delete an asset and its images. Will fail if the asset has active borrow requests. Requires staff or admin role.",
      inputSchema: z.object({
        id: z.number().int().positive().describe("Asset ID to delete"),
      }),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    },
    async (input) => {
      try {
        await apiFetch<void>(`/api/assets/${input.id}`, "DELETE");
        return { content: [{ type: "text", text: `Asset ${input.id} deleted successfully.` }] };
      } catch (err) {
        return toMcpError(err);
      }
    },
  );

  server.registerTool(
    "kurupan_get_asset_field_options",
    {
      description: "Get all known categories and locations for autocomplete when creating or filtering assets.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async () => {
      try {
        const data = await apiFetch<{ categories: string[]; locations: string[] }>(
          "/api/assets/field-options",
        );
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toMcpError(err);
      }
    },
  );
}
