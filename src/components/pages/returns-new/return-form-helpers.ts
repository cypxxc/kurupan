import type { ReturnTransaction } from "@/types/returns";

export function buildReturnedQtyMap(returns: ReturnTransaction[]) {
  const returned = new Map<number, number>();

  for (const transaction of returns) {
    for (const item of transaction.items) {
      returned.set(
        item.borrowRequestItemId,
        (returned.get(item.borrowRequestItemId) ?? 0) + item.returnQty,
      );
    }
  }

  return returned;
}

export function formatReturnDate(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
  }).format(new Date(value));
}
