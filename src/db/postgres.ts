import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { TransactionContext } from "@/lib/transaction-context";

import * as schema from "./schema";

declare global {
  var __kurupanPostgresClient: ReturnType<typeof postgres> | undefined;
  var __kurupanDb: PostgresJsDatabase<typeof schema> | undefined;
  var __kurupanPostgresShutdownPromise: Promise<void> | undefined;
  var __kurupanPostgresShutdownRegistered: boolean | undefined;
}

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  return databaseUrl;
}

function parsePoolSize(value: string | undefined, fallback: number) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

function getPostgresPoolMax() {
  const defaultPoolMax = process.env.NODE_ENV === "development" ? 8 : 10;

  return parsePoolSize(process.env.DATABASE_POOL_MAX, defaultPoolMax);
}

async function closePostgresClientInstance() {
  const client = globalThis.__kurupanPostgresClient;

  if (!client) {
    return;
  }

  await client.end();
  globalThis.__kurupanPostgresClient = undefined;
  globalThis.__kurupanDb = undefined;
}

function registerShutdownHooks() {
  if (globalThis.__kurupanPostgresShutdownRegistered) {
    return;
  }

  globalThis.__kurupanPostgresShutdownRegistered = true;

  const shutdown = () => {
    if (!globalThis.__kurupanPostgresShutdownPromise) {
      globalThis.__kurupanPostgresShutdownPromise = closePostgresClientInstance().finally(() => {
        globalThis.__kurupanPostgresShutdownPromise = undefined;
      });
    }

    return globalThis.__kurupanPostgresShutdownPromise;
  };

  process.once("beforeExit", () => {
    void shutdown();
  });
  process.once("SIGINT", () => {
    void shutdown();
  });
  process.once("SIGTERM", () => {
    void shutdown();
  });
}

export function getPostgresClient() {
  if (!globalThis.__kurupanPostgresClient) {
    globalThis.__kurupanPostgresClient = postgres(getDatabaseUrl(), {
      // Dashboard pages fan out into several parallel queries. A pool of 2 in dev
      // causes requests to queue behind each other and makes local navigations feel slow.
      max: getPostgresPoolMax(),
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: (process.env.NODE_ENV === "production" || process.env.APP_ENV === "production" || getDatabaseUrl().includes("sslmode=require")) ? { rejectUnauthorized: false } : false,
    });
    registerShutdownHooks();
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

export async function closePostgresClient() {
  if (!globalThis.__kurupanPostgresShutdownPromise) {
    globalThis.__kurupanPostgresShutdownPromise = closePostgresClientInstance().finally(() => {
      globalThis.__kurupanPostgresShutdownPromise = undefined;
    });
  }

  await globalThis.__kurupanPostgresShutdownPromise;
}
