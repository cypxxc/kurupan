import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { TransactionContext } from "@/lib/transaction-context";

import * as schema from "./schema";

declare global {
  var __kurupanPostgresClient: ReturnType<typeof postgres> | undefined;
  var __kurupanDb: PostgresJsDatabase<typeof schema> | undefined;
}

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  return databaseUrl;
}

export function getPostgresClient() {
  if (!globalThis.__kurupanPostgresClient) {
    globalThis.__kurupanPostgresClient = postgres(getDatabaseUrl(), {
      // Reuse a very small pool in local/dev to avoid exhausting Postgres slots
      // during HMR, route reloads, and parallel server workers.
      max: process.env.NODE_ENV === "development" ? 2 : 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }

  return globalThis.__kurupanPostgresClient;
}

export function getDb() {
  if (!globalThis.__kurupanDb) {
    globalThis.__kurupanDb = drizzle(getPostgresClient(), { schema });
  }

  return globalThis.__kurupanDb;
}

export type AppDb = ReturnType<typeof getDb>;
export type TransactionDb = Parameters<Parameters<AppDb["transaction"]>[0]>[0];
export type DbExecutor = AppDb | TransactionDb;

export function withTransaction<T>(callback: (tx: TransactionDb) => Promise<T>) {
  return getDb().transaction(callback);
}

export function withTransactionContext<T>(
  callback: (ctx: TransactionContext) => Promise<T>,
) {
  return withTransaction((tx) => callback(new TransactionContext(tx)));
}
