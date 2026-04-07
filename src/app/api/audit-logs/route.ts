import type { NextRequest } from "next/server";

import { successResponse } from "@/lib/http/response";
import { requireCurrentActor } from "@/lib/http/request-context";
import { withErrorHandler } from "@/lib/http/withErrorHandler";
import { parseSearchParams } from "@/lib/validators/http";
import { auditLogListQuerySchema } from "@/lib/validators/history";
import { createAuditStack } from "@/modules/audit/createAuditStack";

export const GET = withErrorHandler(async (request: NextRequest) => {
  const actor = await requireCurrentActor(request);
  const filters = parseSearchParams(request, auditLogListQuerySchema);
  const { auditLogService } = createAuditStack();
  const auditLogs = await auditLogService.listAuditLogs(actor, filters);

  return successResponse(auditLogs);
});
