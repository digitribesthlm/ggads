"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

interface User {
  id: string;
  email: string;
  name: string;
  role: "client" | "account_manager";
  clientId?: string | null;
  domain?: string | null;
  company?: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  isAccountManager: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => ({ error: "Not initialized" }),
  logout: async () => {},
  isAccountManager: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || "Login failed" };
      setUser(data.user);
      return {};
    } catch {
      return { error: "Network error" };
    }
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    // Clear the cookie via API
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAccountManager: user?.role === "account_manager",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
