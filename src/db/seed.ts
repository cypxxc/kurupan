import "dotenv/config";

import { sql } from "drizzle-orm";

import { db } from "./postgres";
import { assets, userAccess } from "./schema";

async function main() {
  await db
    .insert(userAccess)
    .values([
      {
        externalUserId: "admin01",
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
}

main()
  .then(async () => {
    await db.$client.end();
  })
  .catch(async (error) => {
    console.error("Database seed failed", error);
    await db.$client.end();
    process.exit(1);
  });
