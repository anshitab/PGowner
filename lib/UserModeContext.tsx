"use client";

import { createContext, useContext } from "react";
import { useAuth } from "./AuthContext";

export type UserMode = "owner" | "tenant" | "super_admin";

interface UserModeContextType {
  mode: UserMode;
}

const UserModeContext = createContext<UserModeContextType>({
  mode: "owner",
});

export function UserModeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const mode: UserMode =
    user?.role === "super_admin"
      ? "super_admin"
      : user?.role === "tenant"
        ? "tenant"
        : "owner";

  return (
    <UserModeContext.Provider value={{ mode }}>
      {children}
    </UserModeContext.Provider>
  );
}

export function useUserMode() {
  return useContext(UserModeContext);
}
