"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { sanitizeInternalNextPath } from "@/lib/navigation";
import { useI18n } from "@/components/providers/i18n-provider";

function LoginContent() {
  const { user, loading, authProvider, login, startSsoLogin } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const nextPath = useMemo(() => {
    return sanitizeInternalNextPath(searchParams.get("next"));
  }, [searchParams]);

  useEffect(() => {
    if (!loading && user) {
      router.replace(nextPath);
    }
  }, [loading, nextPath, router, user]);

  useEffect(() => {
    const authError = searchParams.get("error");
    if (authError) {
      setError(authError);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!loading && !user && authProvider === "oidc" && !searchParams.get("error")) {
      startSsoLogin(nextPath);
    }
  }, [authProvider, loading, nextPath, searchParams, startSsoLogin, user]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login(username, password);
      router.push(nextPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("login.loginFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="surface-panel w-full max-w-sm px-6 py-8 text-center">
          <p className="text-sm text-muted-foreground">{t("login.loading")}</p>
        </div>
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-sm border-border bg-card">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t("login.title")}</CardTitle>
          <CardDescription>{t("login.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {authProvider === "oidc" ? (
            <div className="space-y-4">
              <p className="text-center text-sm text-muted-foreground">
                {t("login.ssoDescription")}
              </p>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button type="button" className="w-full" onClick={() => startSsoLogin(nextPath)}>
                {t("login.continueWithSso")}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="username">{t("login.username")}</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                  autoFocus
                  autoComplete="username"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">{t("login.password")}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? t("login.signingIn") : t("login.signIn")}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LoginFallback() {
  const { t } = useI18n();

  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-muted-foreground">{t("login.loading")}</p>
    </div>
  );
}

export function LoginPageClient() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent />
    </Suspense>
  );
}
