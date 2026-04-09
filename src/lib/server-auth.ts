import { cache } from "react";
import { headers } from "next/headers";

import type { ActorContext } from "@/types/auth";
import { createAuthStack } from "@/modules/auth/createAuthStack";

const createServerRequest = cache(async () => {
  const incomingHeaders = await headers();
  const requestHeaders = new Headers();
  const cookieHeader = incomingHeaders.get("cookie");

  if (cookieHeader) {
    requestHeaders.set("cookie", cookieHeader);
  }

  return new Request("http://localhost", { headers: requestHeaders });
});

export const getCurrentActorFromServer = cache(async (): Promise<ActorContext | null> => {
  const { authService } = createAuthStack();
  return authService.resolveCurrentUserOrNull(await createServerRequest());
});
