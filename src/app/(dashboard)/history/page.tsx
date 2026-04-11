import { redirect } from "next/navigation";

import { HistoryPageClient } from "@/components/pages/history/history-page-client";
import { getCurrentActorFromServer } from "@/lib/server-auth";
import { createHistoryStack } from "@/modules/history/createHistoryStack";

export default async function HistoryPage() {
  const actor = await getCurrentActorFromServer();

  if (!actor) {
    redirect("/login");
  }

  const { historyService } = createHistoryStack();
  const initialHistoryPage = await historyService.listHistoryPage(actor, {
    page: 1,
    limit: 20,
  });

  return <HistoryPageClient initialHistoryPage={initialHistoryPage} />;
}
