import { redirect } from "next/navigation";

import { getCurrentActorFromServer } from "@/lib/server-auth";

export default async function HomePage() {
  const actor = await getCurrentActorFromServer();
  redirect(actor ? "/dashboard" : "/login");
}
