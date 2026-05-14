import { createContext, useContext, useState, ReactNode } from "react";
import { useEffect } from "react";

interface User {
  id: string;
  username: string;
  email: string;
  role: "admin" | "student";
  name?: string;
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
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() || "http://localhost:4000/api";

interface AuthResponse {
  user: User;
}

const parseApiError = async (response: Response): Promise<string> => {
  try {
    const payload = await response.json() as { message?: string };
    return payload.message || "Request failed";
  } catch {
    return "Request failed";
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          credentials: "include",
        });

        if (!response.ok) {
          setUser(null);
          setIsLoadingAuth(false);
          return;
        }

        const payload = await response.json() as { user: User };
        setUser(payload.user);
      } catch {
        setUser(null);
      } finally {
        setIsLoadingAuth(false);
      }
    };

    void restoreSession();
  }, []);

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
      await parseApiError(response);
      return false;
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
