import { sql } from "drizzle-orm";
import { config } from "dotenv";

config({ path: ".env.local" });
config();

async function main() {
  const [{ getDb, getPostgresClient }, { assets, localAuthUsers, userAccess }] = await Promise.all([
    import("./postgres"),
    import("./schema"),
  ]);
  const db = getDb();
  const postgresClient = getPostgresClient();

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
          passwordHash: "$2b$10$Hl6RVC/ASkbVPPoyd8CQ9eNnfJz3DXGGFW9s4gl825RVYIsteLQqK",
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

    await db
      .insert(assets)
      .values([
        {
          assetCode: "NB-001",
          name: "Notebook Dell Latitude",
          category: "Notebook",
          description: "Laptop for office work",
          location: "IT Store",
          totalQty: 10,
          availableQty: 10,
          status: "available",
        },
        {
          assetCode: "PJ-001",
          name: "Projector Epson",
          category: "Projector",
          description: "Meeting room projector",
          location: "Meeting Room A",
          totalQty: 4,
          availableQty: 4,
          status: "available",
        },
        {
          assetCode: "CM-001",
          name: "Camera Sony",
          category: "Camera",
          description: "Marketing content camera",
          location: "Marketing",
          totalQty: 3,
          availableQty: 3,
          status: "available",
        },
        {
          assetCode: "MIC-001",
          name: "Wireless Microphone Set",
          category: "Audio",
          description: "Event microphone set",
          location: "General Affairs",
          totalQty: 6,
          availableQty: 6,
          status: "available",
        },
        {
          assetCode: "TAB-001",
          name: "Tablet iPad",
          category: "Tablet",
          description: "Tablet for field activity",
          location: "Training Room",
          totalQty: 5,
          availableQty: 5,
          status: "maintenance",
        },
      ])
      .onConflictDoUpdate({
        target: assets.assetCode,
        set: {
          name: sql`excluded.name`,
          category: sql`excluded.category`,
          description: sql`excluded.description`,
          location: sql`excluded.location`,
          totalQty: sql`excluded.total_qty`,
          availableQty: sql`excluded.available_qty`,
          status: sql`excluded.status`,
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
