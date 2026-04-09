import { redirect } from "next/navigation";

import DashboardLayout from "@/components/layouts/dashboard-layout";
import { AuthProvider } from "@/lib/auth-context";
import { getCurrentActorFromServer } from "@/lib/server-auth";

export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await getCurrentActorFromServer();

  if (!actor) {
    redirect("/login");
  }

  return (
    <AuthProvider initialUser={actor} initialResolved>
      <DashboardLayout>{children}</DashboardLayout>
    </AuthProvider>
  );
}
