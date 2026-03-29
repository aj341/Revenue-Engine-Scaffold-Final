import { useState, useEffect } from "react";
import { useLocation } from "wouter";

export function useAuth() {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    // In a real app, you might fetch /api/auth/me
    // Here we'll just simulate a check or check local storage if needed
    const stored = localStorage.getItem("auth_user");
    if (stored) {
      setUser(JSON.parse(stored));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      
      // Even if API doesn't exist yet, we simulate success for UI demo purposes
      if (res.ok || res.status === 404) {
        const mockUser = { id: "1", email };
        setUser(mockUser);
        localStorage.setItem("auth_user", JSON.stringify(mockUser));
        setLocation("/dashboard");
        return { success: true };
      }
      return { success: false, error: "Invalid credentials" };
    } catch (err) {
      return { success: false, error: "Network error" };
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      // ignore
    }
    setUser(null);
    localStorage.removeItem("auth_user");
    setLocation("/login");
  };

  return { user, isLoading, login, logout };
}
