import { UserAccessRepository } from "@/modules/access/repositories/UserAccessRepository";
import { AccessService } from "@/modules/access/services/AccessService";

import { CurrentUserResolver } from "./CurrentUserResolver";
import { LegacyUserRepository } from "./repositories/LegacyUserRepository";
import { LocalAuthUserRepository } from "./repositories/LocalAuthUserRepository";
import { SessionRepository } from "./repositories/SessionRepository";
import { AuthService } from "./services/AuthService";

export function createAuthStack() {
  const localAuthUserRepository = new LocalAuthUserRepository();
  const legacyUserRepository = new LegacyUserRepository();
  const sessionRepository = new SessionRepository();
  const userAccessRepository = new UserAccessRepository();
  const accessService = new AccessService(userAccessRepository);
  const currentUserResolver = new CurrentUserResolver(
    sessionRepository,
    accessService,
    localAuthUserRepository,
    legacyUserRepository,
  );
  const authService = new AuthService(
    localAuthUserRepository,
    legacyUserRepository,
    accessService,
    sessionRepository,
    currentUserResolver,
  );

  return {
    localAuthUserRepository,
    legacyUserRepository,
    sessionRepository,
    userAccessRepository,
    accessService,
    currentUserResolver,
    authService,
  };
}
