"use client";

import { ACTIVE_OPTIONS, ROLE_OPTIONS } from "@/components/pages/users/users-page-constants";
import { getSourceLabel, toActiveFilterValue } from "@/components/pages/users/users-page-helpers";
import type {
  ManagedUserDraftMap,
  UserDraft,
} from "@/components/pages/users/users-page-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaginationControls } from "@/components/shared/pagination-controls";
import type { ManagedUser } from "@/types/users";

type ManagedUsersTableProps = {
  users: ManagedUser[];
  loading: boolean;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  drafts: ManagedUserDraftMap;
  currentUserExternalId?: string;
  savingUserId: string | null;
  onDraftChange: (externalUserId: string, nextDraft: Partial<UserDraft>) => void;
  onSave: (user: ManagedUser) => void;
  onPageChange: (page: number) => void;
};

export function ManagedUsersTable({
  users,
  loading,
  page,
  limit,
  total,
  totalPages,
  drafts,
  currentUserExternalId,
  savingUserId,
  onDraftChange,
  onSave,
  onPageChange,
}: ManagedUsersTableProps) {
  const currentPage = Math.min(page, Math.max(1, totalPages));
  const startItem = total === 0 ? 0 : (currentPage - 1) * limit + 1;
  const endItem = total === 0 ? 0 : Math.min(currentPage * limit, total);

  return (
    <Card className="surface-panel">
      <CardHeader>
        <CardTitle>Managed users</CardTitle>
        <CardDescription>
          Review current access, update role assignments, and change account status inline.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>External ID</TableHead>
              <TableHead>Granted by</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  Loading users...
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  No users match the current filters.
                </TableCell>
              </TableRow>
            ) : (
              users.map((managedUser) => {
                const draft = drafts[managedUser.externalUserId] ?? {
                  role: managedUser.role,
                  isActive: managedUser.isActive,
                };
                const isSelf = managedUser.externalUserId === currentUserExternalId;
                const isSaving = savingUserId === managedUser.externalUserId;

                return (
                  <TableRow key={managedUser.externalUserId}>
                    <TableCell className="align-top">
                      <div className="space-y-1">
                        <p className="font-medium">{managedUser.fullName}</p>
                        <p className="text-sm text-muted-foreground">{managedUser.username}</p>
                        <p className="text-xs text-muted-foreground">
                          {managedUser.email ?? "-"} / {getSourceLabel(managedUser.source)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="align-top font-mono text-xs">
                      {managedUser.externalUserId}
                    </TableCell>
                    <TableCell className="align-top">
                      {managedUser.grantedByExternalUserId ?? "-"}
                    </TableCell>
                    <TableCell className="align-top">
                      <Combobox
                        value={draft.role}
                        onChange={(value) =>
                          onDraftChange(managedUser.externalUserId, {
                            role: value as ManagedUser["role"],
                          })
                        }
                        disabled={isSaving || isSelf}
                        options={ROLE_OPTIONS.map((option) => ({
                          value: option.value,
                          label: option.label,
                        }))}
                        className="w-[160px]"
                      />
                    </TableCell>
                    <TableCell className="align-top">
                      <Combobox
                        value={toActiveFilterValue(draft.isActive)}
                        onChange={(value) =>
                          onDraftChange(managedUser.externalUserId, {
                            isActive: value === "true",
                          })
                        }
                        disabled={isSaving || isSelf}
                        options={ACTIVE_OPTIONS.map((option) => ({
                          value: option.value,
                          label: option.label,
                        }))}
                        className="w-[140px]"
                      />
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          onClick={() => onSave(managedUser)}
                          disabled={isSaving}
                        >
                          {isSaving ? "Saving..." : "Save"}
                        </Button>
                      </div>
                      {isSelf ? (
                        <p className="mt-2 text-right text-xs text-muted-foreground">
                          Your own account cannot remove admin access or disable itself.
                        </p>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <div className="flex flex-col gap-3 border-t pt-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground">
            Showing {startItem}-{endItem} of {total} users
          </p>
          <PaginationControls
            page={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </div>
      </CardContent>
    </Card>
  );
}
