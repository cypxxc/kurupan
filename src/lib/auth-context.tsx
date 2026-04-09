"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { getClientAuthProviderMode, type AuthProviderMode } from "@/lib/auth-provider";

export type UserRole = "admin" | "staff" | "borrower";

export type AuthUser = {
  externalUserId: string;
  role: UserRole;
  fullName?: string;
  email?: string | null;
  employeeCode?: string | null;
  department?: string | null;
};

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  authProvider: AuthProviderMode;
  login: (username: string, password: string) => Promise<void>;
  startSsoLogin: (nextPath?: string) => void;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({
  children,
  initialUser = null,
  initialResolved = false,
}: {
  children: ReactNode;
  initialUser?: AuthUser | null;
  initialResolved?: boolean;
}) {
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [loading, setLoading] = useState(!initialResolved);
  const authProvider = getClientAuthProviderMode();
  const didResolveInitialState = useRef(initialResolved);

  const refresh = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/auth/me");
      const data = await response.json();

      if (data.success && data.data?.user) {
        setUser(data.data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      didResolveInitialState.current = true;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (didResolveInitialState.current) {
      return;
    }

    didResolveInitialState.current = true;
    void refresh();
  }, [refresh]);

  const login = async (username: string, password: string) => {
    if (authProvider === "oidc") {
      throw new Error("Password login is disabled.");
    }

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error?.message ?? "Login failed.");
    }

    setUser(data.data.user);
  };

  const startSsoLogin = useCallback((nextPath = "/dashboard") => {
    const params = new URLSearchParams({ next: nextPath });
    window.location.assign(`/api/auth/sso/start?${params.toString()}`);
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, authProvider, login, startSsoLogin, logout, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
