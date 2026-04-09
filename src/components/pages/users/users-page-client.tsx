"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { ManagedUsersTable } from "@/components/pages/users/managed-users-table";
import { UsersFilterCard } from "@/components/pages/users/users-filter-card";
import { buildManagedUserDraftMap } from "@/components/pages/users/users-page-helpers";
import type {
  ActiveFilter,
  ApiResult,
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
import { useAuth } from "@/lib/auth-context";
import type { ManagedUser } from "@/types/users";

export function UsersPageClient() {
  const { user, loading } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [drafts, setDrafts] = useState<ManagedUserDraftMap>({});
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  const fetchUsers = useCallback(async () => {
    if (user?.role !== "admin") {
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

      const response = await fetch(`/api/users?${params.toString()}`);
      const result = (await response.json()) as ApiResult<ManagedUser[]>;

      if (!result.success) {
        toast.error(result.error?.message ?? "Unable to load users.");
        setUsers([]);
        setDrafts({});
        return;
      }

      setUsers(result.data);
      setDrafts(buildManagedUserDraftMap(result.data));
    } catch {
      toast.error("An error occurred while loading users.");
      setUsers([]);
      setDrafts({});
    } finally {
      setLoadingUsers(false);
    }
  }, [activeFilter, debouncedSearch, roleFilter, user?.role]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const totalUsers = users.length;
  const activeUsers = useMemo(
    () => users.filter((managedUser) => managedUser.isActive).length,
    [users],
  );
  const adminUsers = useMemo(
    () => users.filter((managedUser) => managedUser.role === "admin").length,
    [users],
  );

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
      const response = await fetch(`/api/users/${managedUser.externalUserId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: draft.role,
          isActive: draft.isActive,
        }),
      });
      const result = (await response.json()) as ApiResult<ManagedUser>;

      if (!result.success) {
        toast.error(result.error?.message ?? "Unable to update user.");
        return;
      }

      setUsers((current) =>
        current.map((item) =>
          item.externalUserId === managedUser.externalUserId ? result.data : item,
        ),
      );
      setDrafts((current) => ({
        ...current,
        [managedUser.externalUserId]: {
          role: result.data.role,
          isActive: result.data.isActive,
        },
      }));
      toast.success("User access updated.");
    } catch {
      toast.error("An error occurred while updating the user.");
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
        <UsersMetricCard label="Managed users" value={totalUsers} />
        <UsersMetricCard label="Active users" value={activeUsers} />
        <UsersMetricCard label="Admin users" value={adminUsers} />
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
          drafts={drafts}
          currentUserExternalId={user.externalUserId}
          savingUserId={savingUserId}
          onDraftChange={updateDraft}
          onSave={(managedUser) => void handleSaveUser(managedUser)}
        />
      </div>
    </div>
  );
}
