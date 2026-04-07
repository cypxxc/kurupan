import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

export const postgresClient = postgres(databaseUrl, {
  max: 10,
});

export const db = drizzle(postgresClient, { schema });
