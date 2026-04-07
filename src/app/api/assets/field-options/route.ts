import { isNotNull, sql } from "drizzle-orm";

import { getDb } from "@/db/postgres";
import { assets } from "@/db/schema";
import { requireCurrentActor } from "@/lib/http/request-context";
import { successResponse } from "@/lib/http/response";
import { withErrorHandler } from "@/lib/http/withErrorHandler";

export const GET = withErrorHandler(async (request: Request) => {
  await requireCurrentActor(request);

  const db = getDb();

  const [categoryRows, locationRows] = await Promise.all([
    db
      .selectDistinct({ value: assets.category })
      .from(assets)
      .where(isNotNull(assets.category))
      .orderBy(sql`${assets.category} asc`),
    db
      .selectDistinct({ value: assets.location })
      .from(assets)
      .where(isNotNull(assets.location))
      .orderBy(sql`${assets.location} asc`),
  ]);

  return successResponse({
    categories: categoryRows.map((r) => r.value as string),
    locations: locationRows.map((r) => r.value as string),
  });
});
