import { UserAccessRepository } from "@/modules/access/repositories/UserAccessRepository";
import { AccessService } from "@/modules/access/services/AccessService";

import { CurrentUserResolver } from "./CurrentUserResolver";
import { LocalAuthUserRepository } from "./repositories/LocalAuthUserRepository";
import { SessionRepository } from "./repositories/SessionRepository";
import { AuthService } from "./services/AuthService";

export function createAuthStack() {
  const localAuthUserRepository = new LocalAuthUserRepository();
  const sessionRepository = new SessionRepository();
  const userAccessRepository = new UserAccessRepository();
  const accessService = new AccessService(userAccessRepository);
  const currentUserResolver = new CurrentUserResolver(
    sessionRepository,
    accessService,
    localAuthUserRepository,
  );
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
