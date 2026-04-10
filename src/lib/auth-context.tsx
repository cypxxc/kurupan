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

import { apiClient } from "@/lib/api-client";
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
      const data = await apiClient.get<{ user: AuthUser | null }>("/api/auth/me");

      if (data.user) {
        setUser(data.user);
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

    const data = await apiClient.post<{ user: AuthUser }>("/api/auth/login", {
      body: { username, password },
    });

    setUser(data.user);
  };

  const startSsoLogin = useCallback((nextPath = "/dashboard") => {
    const params = new URLSearchParams({ next: nextPath });
    window.location.assign(`/api/auth/sso/start?${params.toString()}`);
  }, []);

  const logout = async () => {
    await apiClient.post<never>("/api/auth/logout", { parseAs: "void" });
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
