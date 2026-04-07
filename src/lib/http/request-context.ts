import type { NextRequest } from "next/server";

import { AuthenticationError } from "@/lib/errors";
import type { ActorContext } from "@/types/auth";
import { createAuthStack } from "@/modules/auth/createAuthStack";

export async function requireCurrentActor(
  request: Request | NextRequest,
): Promise<ActorContext> {
  const { currentUserResolver } = createAuthStack();
  const actor = await currentUserResolver.resolveFromRequest(request);

  if (!actor) {
    throw new AuthenticationError("Authentication required");
  }

  return actor;
}
