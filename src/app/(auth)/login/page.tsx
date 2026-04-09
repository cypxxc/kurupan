import { redirect } from "next/navigation";

import { LoginPageClient } from "@/components/pages/login-page-client";
import { AuthProvider } from "@/lib/auth-context";
import { getCurrentActorFromServer } from "@/lib/server-auth";

export default async function LoginPage() {
  const actor = await getCurrentActorFromServer();

  if (actor) {
    redirect("/dashboard");
  }

  return (
    <AuthProvider initialUser={null} initialResolved>
      <LoginPageClient />
    </AuthProvider>
  );
}
