import { useState, useEffect } from "react";
import { useLocation } from "wouter";

export function useAuth() {
  const [user, setUser] = useState<{ id: string; email: string; name?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
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
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        const authUser = data.user ?? { id: "1", email };
        setUser(authUser);
        localStorage.setItem("auth_user", JSON.stringify(authUser));
        setLocation("/dashboard");
        return { success: true };
      }

      const body = await res.json().catch(() => ({}));
      return { success: false, error: body.error ?? "Invalid email or password" };
    } catch (err) {
      return { success: false, error: "Cannot reach server — please try again" };
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch (e) {
      // ignore
    }
    setUser(null);
    localStorage.removeItem("auth_user");
    setLocation("/login");
  };

  return { user, isLoading, login, logout };
}
