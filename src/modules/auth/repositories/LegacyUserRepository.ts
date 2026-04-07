import type { RowDataPacket } from "mysql2";

import { LegacyIdentityError } from "@/lib/errors";
import { getLegacyMysqlPool } from "@/db/legacy-mysql/client";

type LegacyUserRow = RowDataPacket & {
  username: string;
  employee_code: string | null;
  full_name: string;
  email: string | null;
  department: string | null;
  password_hash: string;
  is_active: number | boolean;
};

export type LegacyUser = {
  externalUserId: string;
  username: string;
  employeeCode: string | null;
  fullName: string;
  email: string | null;
  department: string | null;
  passwordHash: string;
  isOrgActive: boolean;
};

type LegacyQueryValue = string | number | boolean | null;

type Pagination = {
  limit: number;
  offset: number;
};

export class LegacyUserRepository {
  private readonly queryTimeout = Number(process.env.MYSQL_QUERY_TIMEOUT ?? "10000");

  private mapRow(row: LegacyUserRow): LegacyUser {
    return {
      externalUserId: row.username,
      username: row.username,
      employeeCode: row.employee_code,
      fullName: row.full_name,
      email: row.email,
      department: row.department,
      passwordHash: row.password_hash,
      isOrgActive: Boolean(row.is_active),
    };
  }

  private async executeQuery(sql: string, values: LegacyQueryValue[] = []) {
    try {
      const [rows] = await getLegacyMysqlPool().execute<LegacyUserRow[]>(
        { sql, timeout: this.queryTimeout },
        values,
      );

      return rows;
    } catch (error) {
      throw new LegacyIdentityError("Unable to reach the legacy identity database", {
        error,
      });
    }
  }

  async findByUsername(username: string) {
    const rows = await this.executeQuery(
      `
        SELECT username, employee_code, full_name, email, department, password_hash, is_active
        FROM users
        WHERE username = ?
        LIMIT 1
      `,
      [username],
    );

    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  async findById(externalUserId: string) {
    const rows = await this.executeQuery(
      `
        SELECT username, employee_code, full_name, email, department, password_hash, is_active
        FROM users
        WHERE username = ?
        LIMIT 1
      `,
      [externalUserId],
    );

    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  async searchUsers(query: string, pagination: Pagination) {
    const likeQuery = `%${query}%`;
    const rows = await this.executeQuery(
      `
        SELECT username, employee_code, full_name, email, department, password_hash, is_active
        FROM users
        WHERE (full_name LIKE ? OR employee_code LIKE ? OR email LIKE ?)
          AND is_active = 1
        ORDER BY full_name
        LIMIT ?
        OFFSET ?
      `,
      [likeQuery, likeQuery, likeQuery, pagination.limit, pagination.offset],
    );

    return rows.map((row) => this.mapRow(row));
  }

  async batchFindByIds(ids: string[]) {
    if (ids.length === 0) {
      return [];
    }

    const placeholders = ids.map(() => "?").join(", ");
    const rows = await this.executeQuery(
      `
        SELECT username, employee_code, full_name, email, department, password_hash, is_active
        FROM users
        WHERE username IN (${placeholders})
      `,
      ids,
    );

    return rows.map((row) => this.mapRow(row));
  }
}
