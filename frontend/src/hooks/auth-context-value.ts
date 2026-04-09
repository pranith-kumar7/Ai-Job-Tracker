import { createContext } from "react";
import type { Credentials, User } from "../types/job-tracker";

export interface AuthContextValue {
  user: User | null;
  isAuthLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: Credentials) => Promise<User>;
  register: (credentials: Credentials) => Promise<User>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
