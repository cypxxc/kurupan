import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const legacyMysqlUrl = process.env.LEGACY_MYSQL_URL;

if (!legacyMysqlUrl) {
  throw new Error("LEGACY_MYSQL_URL is not set");
}

const connectTimeout = Number(process.env.MYSQL_CONNECT_TIMEOUT ?? "5000");

export const legacyMysqlPool = mysql.createPool({
  uri: legacyMysqlUrl,
  waitForConnections: true,
  connectionLimit: 5,
  maxIdle: 5,
  idleTimeout: 60_000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  connectTimeout,
});

export const legacyMysqlDb = drizzle({
  client: legacyMysqlPool,
  mode: "default",
});
