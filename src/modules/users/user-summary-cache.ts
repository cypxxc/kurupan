import { revalidateTag, unstable_cache } from "next/cache";

import { LocalAuthUserRepository, type ManagedUserSummary } from "@/modules/auth/repositories/LocalAuthUserRepository";

export const USER_SUMMARY_TAG = "managed-user-summary";

const getManagedUserSummaryCached = unstable_cache(
  async (): Promise<ManagedUserSummary> => {
    const repository = new LocalAuthUserRepository();
    return repository.getManagedUserSummary();
  },
  ["managed-user-summary"],
  {
    tags: [USER_SUMMARY_TAG],
    revalidate: 120,
  },
);

export function getCachedManagedUserSummary() {
  return getManagedUserSummaryCached();
}

export function revalidateManagedUserSummaryCache() {
  revalidateTag(USER_SUMMARY_TAG, "max");
}
