import { hash } from "bcryptjs";
import { sql } from "drizzle-orm";
import { config } from "dotenv";

import { assertNotProductionEnvironment } from "@/lib/env/safety";

config({ path: ".env.local" });
config();

assertNotProductionEnvironment("db:seed");

async function main() {
  const seedAdminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (!seedAdminPassword) {
    throw new Error("SEED_ADMIN_PASSWORD must be set before running db:seed.");
  }

  const [{ getDb, getPostgresClient }, { localAuthUsers, userAccess }] = await Promise.all([
    import("./postgres"),
    import("./schema"),
  ]);
  const db = getDb();
  const postgresClient = getPostgresClient();
  const adminPasswordHash = await hash(seedAdminPassword, 10);

  try {
    await db
      .insert(userAccess)
      .values([
        {
          externalUserId: "admin",
          role: "admin",
          isActive: true,
          grantedByExternalUserId: "system",
        },
        {
          externalUserId: "staff01",
          role: "staff",
          isActive: true,
          grantedByExternalUserId: "system",
        },
      ])
      .onConflictDoUpdate({
        target: userAccess.externalUserId,
        set: {
          role: sql`excluded.role`,
          isActive: sql`excluded.is_active`,
          grantedByExternalUserId: sql`excluded.granted_by_external_user_id`,
          updatedAt: new Date(),
        },
      });

    await db
      .insert(localAuthUsers)
      .values([
        {
          externalUserId: "admin",
          username: "admin",
          passwordHash: adminPasswordHash,
          fullName: "System Administrator",
          email: "admin@local.test",
          employeeCode: "LOCAL-ADMIN-001",
          department: "IT",
          isActive: true,
        },
      ])
      .onConflictDoUpdate({
        target: localAuthUsers.username,
        set: {
          externalUserId: sql`excluded.external_user_id`,
          passwordHash: sql`excluded.password_hash`,
          fullName: sql`excluded.full_name`,
          email: sql`excluded.email`,
          employeeCode: sql`excluded.employee_code`,
          department: sql`excluded.department`,
          isActive: sql`excluded.is_active`,
          updatedAt: new Date(),
        },
      });
  } finally {
    await postgresClient.end();
  }
}

main()
  .catch(async (error) => {
    console.error("Database seed failed", error);
    process.exit(1);
  });
