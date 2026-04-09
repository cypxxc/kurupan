import { PackagePlus, Search } from "lucide-react";

import { StatusBadge } from "@/components/shared/status-badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatAssetQuantity } from "@/lib/asset-standards";
import type { BorrowableAsset } from "@/types/borrow-requests";

type BorrowAssetPickerProps = {
  searchTerm: string;
  loading: boolean;
  assets: BorrowableAsset[];
  onSearchTermChange: (value: string) => void;
  onSelect: (asset: BorrowableAsset) => void;
};

export function BorrowAssetPicker({
  searchTerm,
  loading,
  assets,
  onSearchTermChange,
  onSelect,
}: BorrowAssetPickerProps) {
  return (
    <div className="surface-panel surface-section">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <PackagePlus className="size-4" />
        Asset picker
      </div>
      <div className="mt-4 space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
            placeholder="Search by name, code, category, or location"
            className="pl-9"
          />
        </div>

        <div className="max-h-[520px] overflow-y-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead className="text-center">Available</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div className="h-10 w-full animate-pulse rounded bg-muted" />
                    </TableCell>
                    <TableCell>
                      <div className="mx-auto h-4 w-10 animate-pulse rounded bg-muted" />
                    </TableCell>
                  </TableRow>
                ))
              ) : assets.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={2}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No borrowable assets match the current search.
                  </TableCell>
                </TableRow>
              ) : (
                assets.map((asset) => (
                  <TableRow
                    key={asset.id}
                    onClick={() => onSelect(asset)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelect(asset);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    title="Add to request"
                    className="cursor-pointer"
                  >
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p
                            title={asset.name}
                            className="max-w-[14rem] truncate font-medium"
                          >
                            {asset.name}
                          </p>
                          <StatusBadge type="asset" value={asset.status} />
                        </div>
                        <p className="font-mono text-xs text-muted-foreground">
                          {asset.assetCode}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {asset.category ?? "Uncategorized"} / {asset.location ?? "No location"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {formatAssetQuantity(asset.availableQty)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
