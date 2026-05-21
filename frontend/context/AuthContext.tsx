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
  requestSignupOtp: (params: {
    email: string;
    password: string;
    name: string;
    role?: "admin" | "student";
    username?: string;
  }) => Promise<SignupOtpResponse>;
  verifySignupOtp: (params: {
    email: string;
    otp: string;
  }) => Promise<User>;
  requestPasswordResetOtp: (params: {
    email: string;
  }) => Promise<PasswordResetOtpResponse>;
  verifyPasswordResetOtp: (params: {
    email: string;
    otp: string;
    password: string;
  }) => Promise<void>;
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

interface SignupOtpResponse {
  message: string;
  email: string;
  expiresInSeconds: number;
  otpPreview?: string;
}

interface PasswordResetOtpResponse {
  message: string;
  email: string;
  expiresInSeconds: number;
  otpPreview?: string;
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

  const requestSignupOtp = async ({
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
  }): Promise<SignupOtpResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/signup/request-otp`, {
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

    return response.json() as Promise<SignupOtpResponse>;
  };

  const verifySignupOtp = async ({
    email,
    otp,
  }: {
    email: string;
    otp: string;
  }): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/auth/signup/verify`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, otp }),
    });

    if (!response.ok) {
      throw new Error(await parseApiError(response));
    }

    const payload = await response.json() as AuthResponse;
    setUser(payload.user);

    return payload.user;
  };

  const requestPasswordResetOtp = async ({ email }: { email: string }): Promise<PasswordResetOtpResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/password-reset/request-otp`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      throw new Error(await parseApiError(response));
    }

    return response.json() as Promise<PasswordResetOtpResponse>;
  };

  const verifyPasswordResetOtp = async ({
    email,
    otp,
    password,
  }: {
    email: string;
    otp: string;
    password: string;
  }): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/auth/password-reset/verify`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, otp, password }),
    });

    if (!response.ok) {
      throw new Error(await parseApiError(response));
    }
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
        requestSignupOtp,
        verifySignupOtp,
        requestPasswordResetOtp,
        verifyPasswordResetOtp,
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
