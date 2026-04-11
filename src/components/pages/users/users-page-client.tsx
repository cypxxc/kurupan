"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { ManagedUsersTable } from "@/components/pages/users/managed-users-table";
import { UsersFilterCard } from "@/components/pages/users/users-filter-card";
import { buildManagedUserDraftMap } from "@/components/pages/users/users-page-helpers";
import type {
  ActiveFilter,
  ManagedUserDraftMap,
  RoleFilter,
  UserDraft,
} from "@/components/pages/users/users-page-types";
import { UsersMetricCard } from "@/components/pages/users/users-metric-card";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { apiClient, getApiErrorMessage } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import type { PaginatedResult } from "@/lib/pagination";
import type { ManagedUser } from "@/types/users";
import type { ManagedUserSummary } from "@/modules/auth/repositories/LocalAuthUserRepository";

const PAGE_SIZE = 10;

function createEmptyUserPage(page = 1): PaginatedResult<ManagedUser> {
  return {
    items: [],
    page,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false,
  };
}

function applyManagedUserSummaryUpdate(
  summary: ManagedUserSummary,
  previousUser: ManagedUser,
  nextUser: ManagedUser,
): ManagedUserSummary {
  const nextSummary = { ...summary };

  if (previousUser.isActive !== nextUser.isActive) {
    if (nextUser.isActive) {
      nextSummary.activeUsers += 1;
      nextSummary.inactiveUsers = Math.max(0, nextSummary.inactiveUsers - 1);
    } else {
      nextSummary.activeUsers = Math.max(0, nextSummary.activeUsers - 1);
      nextSummary.inactiveUsers += 1;
    }
  }

  if (previousUser.role !== nextUser.role) {
    if (previousUser.role === "admin") {
      nextSummary.adminUsers = Math.max(0, nextSummary.adminUsers - 1);
    }

    if (previousUser.role === "staff") {
      nextSummary.staffUsers = Math.max(0, nextSummary.staffUsers - 1);
    }

    if (nextUser.role === "admin") {
      nextSummary.adminUsers += 1;
    }

    if (nextUser.role === "staff") {
      nextSummary.staffUsers += 1;
    }
  }

  return nextSummary;
}

export function UsersPageClient({
  initialPage,
  initialSummary,
}: {
  initialPage: PaginatedResult<ManagedUser>;
  initialSummary: ManagedUserSummary;
}) {
  const { user, loading } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>(initialPage.items);
  const [pagination, setPagination] = useState<PaginatedResult<ManagedUser>>(initialPage);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [drafts, setDrafts] = useState<ManagedUserDraftMap>({});
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [page, setPage] = useState(initialPage.page);
  const [userSummary, setUserSummary] = useState(initialSummary);
  const skipInitialFetch = useRef(true);
  const previousFilterKeyRef = useRef("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => {
    setUsers(initialPage.items);
    setPagination(initialPage);
    setPage(initialPage.page);
    setDrafts(buildManagedUserDraftMap(initialPage.items));
    setLoadingUsers(false);
  }, [initialPage]);

  useEffect(() => {
    setUserSummary(initialSummary);
  }, [initialSummary]);

  const fetchUsers = useCallback(async () => {
    if (user?.role !== "admin") {
      setUsers([]);
      setPagination(createEmptyUserPage());
      setDrafts({});
      setLoadingUsers(false);
      return;
    }

    setLoadingUsers(true);

    try {
      const params = new URLSearchParams();

      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }

      if (roleFilter !== "all") {
        params.set("role", roleFilter);
      }

      if (activeFilter !== "all") {
        params.set("isActive", activeFilter);
      }

      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));

      const data = await apiClient.get<PaginatedResult<ManagedUser>>("/api/users", {
        query: params,
      });

      setUsers(data.items);
      setPagination(data);
      setDrafts(buildManagedUserDraftMap(data.items));
    } catch (error) {
      toast.error(getApiErrorMessage(error, "An error occurred while loading users."));
      setUsers([]);
      setPagination(createEmptyUserPage(page));
      setDrafts({});
    } finally {
      setLoadingUsers(false);
    }
  }, [activeFilter, debouncedSearch, page, roleFilter, user?.role]);

  useEffect(() => {
    const filterKey = `${debouncedSearch}|${roleFilter}|${activeFilter}`;

    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      previousFilterKeyRef.current = filterKey;
      setDrafts(buildManagedUserDraftMap(initialPage.items));
      return;
    }

    if (previousFilterKeyRef.current !== filterKey && page !== 1) {
      previousFilterKeyRef.current = filterKey;
      setPage(1);
      return;
    }

    previousFilterKeyRef.current = filterKey;
    void fetchUsers();
  }, [activeFilter, debouncedSearch, fetchUsers, initialPage.items, page, roleFilter]);

  const updateDraft = (externalUserId: string, nextDraft: Partial<UserDraft>) => {
    setDrafts((current) => ({
      ...current,
      [externalUserId]: {
        role: current[externalUserId]?.role ?? "borrower",
        isActive: current[externalUserId]?.isActive ?? true,
        ...nextDraft,
      },
    }));
  };

  const handleSaveUser = async (managedUser: ManagedUser) => {
    const draft = drafts[managedUser.externalUserId];
    if (!draft) {
      return;
    }

    setSavingUserId(managedUser.externalUserId);

    try {
      const data = await apiClient.patch<ManagedUser>(`/api/users/${managedUser.externalUserId}`, {
        body: {
          role: draft.role,
          isActive: draft.isActive,
        },
      });

      setUsers((current) =>
        current.map((item) =>
          item.externalUserId === managedUser.externalUserId ? data : item,
        ),
      );
      setUserSummary((current) => applyManagedUserSummaryUpdate(current, managedUser, data));
      setDrafts((current) => ({
        ...current,
        [managedUser.externalUserId]: {
          role: data.role,
          isActive: data.isActive,
        },
      }));
      toast.success("User access updated.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "An error occurred while updating the user."));
    } finally {
      setSavingUserId(null);
    }
  };

  if (loading) {
    return (
      <div className="empty-state text-sm text-muted-foreground">
        Checking access permissions...
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <Card className="surface-panel">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <ShieldAlert className="size-5" />
            </div>
            <div>
              <CardTitle>Access denied</CardTitle>
              <CardDescription>
                The user management screen is available only to administrators.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Link
            href="/dashboard"
            prefetch={false}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Back to dashboard
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">User Management</p>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Users</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Review managed accounts, update access, and keep all user identities in the
              local authentication store.
            </p>
          </div>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <UsersMetricCard label="Managed users" value={userSummary.totalUsers} />
        <UsersMetricCard label="Active users" value={userSummary.activeUsers} />
        <UsersMetricCard label="Admin users" value={userSummary.adminUsers} />
      </section>

      <div className="space-y-6">
        <UsersFilterCard
          searchInput={searchInput}
          roleFilter={roleFilter}
          activeFilter={activeFilter}
          onSearchInputChange={setSearchInput}
          onRoleFilterChange={setRoleFilter}
          onActiveFilterChange={setActiveFilter}
          onRefresh={() => void fetchUsers()}
        />

        <ManagedUsersTable
          users={users}
          loading={loadingUsers}
          page={pagination.page}
          limit={pagination.limit}
          total={pagination.total}
          totalPages={pagination.totalPages}
          drafts={drafts}
          currentUserExternalId={user.externalUserId}
          savingUserId={savingUserId}
          onDraftChange={updateDraft}
          onSave={(managedUser) => void handleSaveUser(managedUser)}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
