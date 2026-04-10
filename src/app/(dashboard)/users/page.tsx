import { redirect } from "next/navigation";

import { UsersPageClient } from "@/components/pages/users/users-page-client";
import type { ManagedUserSummary } from "@/modules/auth/repositories/LocalAuthUserRepository";
import { getCurrentActorFromServer } from "@/lib/server-auth";
import type { PaginatedResult } from "@/lib/pagination";
import { createUserManagementStack } from "@/modules/users/createUserManagementStack";
import type { ManagedUser } from "@/types/users";

const EMPTY_USER_PAGE: PaginatedResult<ManagedUser> = {
  items: [],
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
  hasPreviousPage: false,
  hasNextPage: false,
};

const EMPTY_USER_SUMMARY: ManagedUserSummary = {
  totalUsers: 0,
  activeUsers: 0,
  inactiveUsers: 0,
  adminUsers: 0,
  staffUsers: 0,
};

export default async function UsersPage() {
  const actor = await getCurrentActorFromServer();

  if (!actor) {
    redirect("/login");
  }

  if (actor.role !== "admin") {
    return (
      <UsersPageClient initialPage={EMPTY_USER_PAGE} initialSummary={EMPTY_USER_SUMMARY} />
    );
  }

  const { userManagementService } = createUserManagementStack();
  const [initialPage, initialSummary] = await Promise.all([
    userManagementService.listUsers(actor, {
      search: "",
      isActive: undefined,
      page: 1,
      limit: 10,
    }),
    userManagementService.getUserSummary(actor),
  ]);

  return <UsersPageClient initialPage={initialPage} initialSummary={initialSummary} />;
}
