import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AuthContextType {
  isAuthenticated: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is already logged in from localStorage
    const auth = localStorage.getItem("isAuthenticated");
    if (auth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  const login = (username: string, password: string): boolean => {
    // Get credentials from environment variables
    const validUsername = import.meta.env.VITE_AUTH_USERNAME || "digital";
    const validPassword = import.meta.env.VITE_AUTH_PASSWORD || "digital2026";

    console.log("Login attempt:", { username, password });
    console.log("Expected credentials:", { validUsername, validPassword });
    console.log("Comparison:", {
      usernameMatch: username === validUsername,
      passwordMatch: password === validPassword,
    });

    if (username === validUsername && password === validPassword) {
      setIsAuthenticated(true);
      localStorage.setItem("isAuthenticated", "true");
      return true;
    }

    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("isAuthenticated");
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
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
