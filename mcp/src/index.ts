import "dotenv/config";
import process from "node:process";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { BASE_URL, PASSWORD, USERNAME } from "./constants.js";
import {
  registerAssetCodeSeriesTools,
  registerAssetTools,
  registerAuthTools,
  registerBorrowRequestTools,
  registerHistoryTools,
  registerNotificationTools,
  registerReturnTools,
  registerUserTools,
} from "./tools/index.js";

function assertConfiguration(): void {
  const missing: string[] = [];

  if (!USERNAME) {
    missing.push("KURUPAN_USERNAME");
  }

  if (!PASSWORD) {
    missing.push("KURUPAN_PASSWORD");
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  try {
    new URL(BASE_URL);
  } catch {
    throw new Error(`KURUPAN_BASE_URL must be a valid absolute URL. Received: ${BASE_URL}`);
  }
}

function createServer(): McpServer {
  const server = new McpServer({
    name: "kurupan-mcp-server",
    version: "1.0.0",
  });

  registerAuthTools(server);
  registerAssetCodeSeriesTools(server);
  registerAssetTools(server);
  registerBorrowRequestTools(server);
  registerReturnTools(server);
  registerUserTools(server);
  registerNotificationTools(server);
  registerHistoryTools(server);

  return server;
}

async function main(): Promise<void> {
  assertConfiguration();

  const server = createServer();
  const transport = new StdioServerTransport();

  process.on("SIGINT", () => {
    void server.close().finally(() => process.exit(0));
  });

  process.on("SIGTERM", () => {
    void server.close().finally(() => process.exit(0));
  });

  await server.connect(transport);
  console.error(`[kurupan-mcp] Connected over stdio. Target app: ${BASE_URL}`);
}

process.on("unhandledRejection", (reason) => {
  console.error("[kurupan-mcp] Unhandled rejection:", reason);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  console.error("[kurupan-mcp] Uncaught exception:", error);
  process.exit(1);
});

main().catch((error) => {
  console.error("[kurupan-mcp] Failed to start:", error);
  process.exit(1);
});
