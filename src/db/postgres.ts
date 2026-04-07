import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";

import * as schema from "./schema";

let postgresClient: ReturnType<typeof postgres> | null = null;
let db: PostgresJsDatabase<typeof schema> | null = null;

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  return databaseUrl;
}

export function getPostgresClient() {
  if (!postgresClient) {
    postgresClient = postgres(getDatabaseUrl(), {
      max: 10,
    });
  }

  return postgresClient;
}

export function getDb() {
  if (!db) {
    db = drizzle(getPostgresClient(), { schema });
  }

  return db;
}

export type AppDb = ReturnType<typeof getDb>;
export type TransactionDb = Parameters<Parameters<AppDb["transaction"]>[0]>[0];
export type DbExecutor = AppDb | TransactionDb;

export function withTransaction<T>(callback: (tx: TransactionDb) => Promise<T>) {
  return getDb().transaction(callback);
}
