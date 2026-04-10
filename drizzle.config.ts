import { config } from "dotenv";

import { defineConfig } from "drizzle-kit";

import { assertNotProductionEnvironment } from "./src/lib/env/safety";

config({ path: ".env.local" });
config();

if (process.argv.includes("push")) {
  assertNotProductionEnvironment("drizzle-kit push");
}

export default defineConfig({
  out: "./src/db/migrations",
  schema: "./src/db/schema/*.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
