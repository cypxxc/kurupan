import type { DbExecutor } from "@/db/postgres";
import { UserAccessRepository } from "@/modules/access/repositories/UserAccessRepository";
import { AccessService } from "@/modules/access/services/AccessService";

import { CurrentUserResolver } from "./CurrentUserResolver";
import { LocalAuthUserRepository } from "./repositories/LocalAuthUserRepository";
import { SessionRepository } from "./repositories/SessionRepository";
import { AuthService } from "./services/AuthService";

export function createAuthStack(db?: DbExecutor) {
  const localAuthUserRepository = new LocalAuthUserRepository(db);
  const sessionRepository = new SessionRepository(db);
  const userAccessRepository = new UserAccessRepository(db);
  const accessService = new AccessService(userAccessRepository);
  const currentUserResolver = new CurrentUserResolver(sessionRepository);
  const authService = new AuthService(
    localAuthUserRepository,
    accessService,
    sessionRepository,
    currentUserResolver,
  );

  return {
    localAuthUserRepository,
    sessionRepository,
    userAccessRepository,
    accessService,
    currentUserResolver,
    authService,
  };
}
