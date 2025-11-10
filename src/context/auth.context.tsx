import React, { createContext, useState, useEffect, useRef } from "react";
import type { User } from "../types";
import { apiService } from "../service/api.service";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const hasCheckedAuth = useRef(false);
  const isCheckingAuth = useRef(false); // 🔥 Prevent concurrent checks

  useEffect(() => {
    // 🔥 Prevent double check in StrictMode or concurrent calls
    if (!hasCheckedAuth.current && !isCheckingAuth.current) {
      hasCheckedAuth.current = true;
      isCheckingAuth.current = true;
      checkAuth().finally(() => {
        isCheckingAuth.current = false;
      });
    }
  }, []);

  const checkAuth = async () => {
    try {
      console.log("🔍 Checking authentication...");
      console.log("🍪 Cookies will be sent with credentials");
      
      const response = await apiService.getProfile();

      if (response.success && response.data) {
        console.log("✅ User authenticated:", response.data.user.email);
        setUser(response.data.user);
      } else {
        console.log("⚠️ No user data in response");
        setUser(null);
      }
    } catch (error: any) {
      // 🔥 Only clear user on 401 (unauthorized)
      if (error.response?.status === 401) {
        console.log("ℹ️ Not authenticated (401 - expected when not logged in)");
        setUser(null);
      } else if (!error.response) {
        // 🔥 Network error - backend might be down, keep loading state
        console.error("🔴 Network error - backend unreachable");
        console.error("⚠️ Not clearing user state, backend might be temporarily down");
      } else {
        // 🔥 Other errors (500, etc) - log but don't necessarily log out
        console.error("❌ Auth check failed:", error.message, error.response?.status);
        console.error("⚠️ Non-401 error, not clearing user state");
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await apiService.login({ email, password });

      if (response.success && response.data) {
        console.log("✅ Login successful:", response.data.user.email);
        setUser(response.data.user);
      }
    } catch (error) {
      console.error("❌ Login failed:", error);
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await apiService.register({ name, email, password });

      if (response.success && response.data) {
        console.log("✅ Registration successful:", response.data.user.email);
        setUser(response.data.user);
      }
    } catch (error) {
      console.error("❌ Registration failed:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
      console.log("✅ Logout successful");
    } catch (error) {
      console.error("⚠️ Logout API failed (continuing anyway):", error);
    } finally {
      setUser(null);
      hasCheckedAuth.current = false; // 🔥 Reset for next login
      isCheckingAuth.current = false; // 🔥 Reset checking flag
    }
  };

  const refreshProfile = async () => {
    if (isCheckingAuth.current) {
      console.log("⏳ Already checking auth, skipping...");
      return;
    }
    isCheckingAuth.current = true;
    setLoading(true);
    await checkAuth().finally(() => {
      isCheckingAuth.current = false;
    });
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext };
