import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function BorrowRequestEmptyState() {
  return (
    <div className="empty-state px-6 py-14">
      <h1 className="text-xl font-semibold">Borrow request not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The request may not exist or you may not have permission to view it.
      </p>
      <Link
        href="/borrow-requests"
        className={cn(buttonVariants({ variant: "outline" }), "mt-5")}
      >
        Back to requests
      </Link>
    </div>
  );
}
