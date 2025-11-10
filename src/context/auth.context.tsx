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

  useEffect(() => {
    if (!hasCheckedAuth.current) {
      hasCheckedAuth.current = true;
      checkAuth();
    }
  }, []);

  const checkAuth = async () => {
    try {
      console.log("🔍 Checking authentication...");
      const response = await apiService.getProfile();

      if (response.success && response.data) {
        console.log("✅ User authenticated:", response.data.user.email);
        setUser(response.data.user);
      } else {
        console.log("⚠️ No user data in response");
        setUser(null);
      }
    } catch (error: any) {
      // 🔥 Don't log 401 as error (it's expected when not logged in)
      if (error.response?.status === 401) {
        console.log("ℹ️ Not authenticated (expected)");
      } else {
        console.error("❌ Auth check failed:", error.message);
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      console.log("🔐 Attempting login...");
      const response = await apiService.login({ email, password });

      if (response.success && response.data) {
        console.log("✅ Login successful:", response.data.user.email);
        console.log("🍪 Auth cookies should now be set by backend");
        console.log("👤 User ID:", response.data.user.id);
        setUser(response.data.user);
      }
    } catch (error) {
      console.error("❌ Login failed:", error);
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      console.log("📝 Attempting registration...");
      const response = await apiService.register({ name, email, password });

      if (response.success && response.data) {
        console.log("✅ Registration successful:", response.data.user.email);
        console.log("🍪 Auth cookies should now be set by backend");
        console.log("👤 User ID:", response.data.user.id);
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
    }
  };

  const refreshProfile = async () => {
    setLoading(true);
    await checkAuth();
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
