import { createContext, useCallback, useContext, useState, ReactNode } from "react";
import { useEffect } from "react";
import { API_BASE_URL, parseApiError } from "../lib/api";

export interface User {
  id: string;
  username: string;
  email: string;
  role: "admin" | "student";
  name?: string;
  walletAddress?: string;
  walletVerifiedAt?: string | null;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string, role?: "admin" | "student") => Promise<User | null>;
  signup: (params: {
    email: string;
    password: string;
    name: string;
    role?: "admin" | "student";
    username?: string;
  }) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthResponse {
  user: User;
}

interface SessionResponse {
  user: User | null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        credentials: "include",
      });

      if (!response.ok) {
        setUser(null);
        return null;
      }

      const payload = await response.json() as SessionResponse;
      setUser(payload.user);
      return payload.user;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    void refreshUser().finally(() => setIsLoadingAuth(false));
  }, [refreshUser]);

  const login = async (identifier: string, password: string, role?: "admin" | "student"): Promise<User | null> => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ identifier, password }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json() as AuthResponse;
    const loggedInUser = payload.user;

    if (role && loggedInUser.role !== role) {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      setUser(null);
      return null;
    }

    setUser(loggedInUser);
    return loggedInUser;
  };

  const signup = async ({
    email,
    password,
    name,
    role = "student",
    username,
  }: {
    email: string;
    password: string;
    name: string;
    role?: "admin" | "student";
    username?: string;
  }): Promise<boolean> => {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        name,
        role,
        username,
      }),
    });

    if (!response.ok) {
      throw new Error(await parseApiError(response));
    }

    const payload = await response.json() as AuthResponse;
    const sessionUser = payload.user;

    setUser(sessionUser);

    return true;
  };

  const logout = async () => {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        signup,
        logout,
        refreshUser,
        isAuthenticated: !!user,
        isLoadingAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
