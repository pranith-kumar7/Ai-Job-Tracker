import { useEffect, useState, type ReactNode } from "react";
import { authApi, TOKEN_STORAGE_KEY } from "../services/api";
import type { Credentials, User } from "../types/job-tracker";
import { AuthContext } from "./auth-context-value";

const persistUserSession = (token: string, user: User) => {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  return user;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(() =>
    Boolean(localStorage.getItem(TOKEN_STORAGE_KEY))
  );

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);

    if (!token) {
      return;
    }

    let active = true;

    authApi
      .me()
      .then((currentUser) => {
        if (active) {
          setUser(currentUser);
        }
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        if (active) {
          setUser(null);
        }
      })
      .finally(() => {
        if (active) {
          setIsAuthLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const login = async (credentials: Credentials) => {
    const response = await authApi.login(credentials);
    const nextUser = persistUserSession(response.token, response.user);
    setUser(nextUser);
    setIsAuthLoading(false);
    return nextUser;
  };

  const register = async (credentials: Credentials) => {
    const response = await authApi.register(credentials);
    const nextUser = persistUserSession(response.token, response.user);
    setUser(nextUser);
    setIsAuthLoading(false);
    return nextUser;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setUser(null);
    setIsAuthLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthLoading,
        isAuthenticated: Boolean(user),
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
