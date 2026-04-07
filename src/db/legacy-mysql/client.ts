import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

let legacyMysqlPool: mysql.Pool | null = null;

function getLegacyMysqlUrl() {
  const legacyMysqlUrl = process.env.LEGACY_MYSQL_URL;

  if (!legacyMysqlUrl) {
    throw new Error("LEGACY_MYSQL_URL is not set");
  }

  return legacyMysqlUrl;
}

export function getLegacyMysqlPool() {
  if (!legacyMysqlPool) {
    const connectTimeout = Number(process.env.MYSQL_CONNECT_TIMEOUT ?? "5000");

    legacyMysqlPool = mysql.createPool({
      uri: getLegacyMysqlUrl(),
      waitForConnections: true,
      connectionLimit: 5,
      maxIdle: 5,
      idleTimeout: 60_000,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      connectTimeout,
    });
  }

  return legacyMysqlPool;
}

export function getLegacyMysqlDb() {
  return drizzle({
    client: getLegacyMysqlPool() as never,
    mode: "default",
  });
}
