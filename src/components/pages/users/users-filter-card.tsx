"use client";

import { Search, Users } from "lucide-react";

import { ACTIVE_OPTIONS, ROLE_OPTIONS } from "@/components/pages/users/users-page-constants";
import type {
  ActiveFilter,
  RoleFilter,
} from "@/components/pages/users/users-page-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";

type UsersFilterCardProps = {
  searchInput: string;
  roleFilter: RoleFilter;
  activeFilter: ActiveFilter;
  onSearchInputChange: (value: string) => void;
  onRoleFilterChange: (value: RoleFilter) => void;
  onActiveFilterChange: (value: ActiveFilter) => void;
  onRefresh: () => void;
};

export function UsersFilterCard({
  searchInput,
  roleFilter,
  activeFilter,
  onSearchInputChange,
  onRoleFilterChange,
  onActiveFilterChange,
  onRefresh,
}: UsersFilterCardProps) {
  return (
    <Card className="surface-panel">
      <CardHeader>
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Users className="size-4" />
          Filters
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        <div className="md:col-span-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(event) => onSearchInputChange(event.target.value)}
              placeholder="Search by name, username, email, or employee code"
              className="pl-9"
            />
          </div>
        </div>

        <Combobox
          value={roleFilter}
          onChange={(value) => onRoleFilterChange((value || "all") as RoleFilter)}
          options={[
            { value: "all", label: "All roles" },
            ...ROLE_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
          ]}
          placeholder="All roles"
        />

        <Combobox
          value={activeFilter}
          onChange={(value) => onActiveFilterChange((value || "all") as ActiveFilter)}
          options={[
            { value: "all", label: "All statuses" },
            ...ACTIVE_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
          ]}
          placeholder="All statuses"
        />

        <Button variant="outline" onClick={onRefresh}>
          Refresh list
        </Button>
      </CardContent>
    </Card>
  );
}
