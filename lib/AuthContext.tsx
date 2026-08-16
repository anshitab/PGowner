"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "./supabase";
import type { User, Session } from "@supabase/supabase-js";

export type AuthRole = "owner" | "tenant" | "super_admin";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: AuthRole;
  propertyId?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthUser | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string, role: AuthRole) => Promise<{ error?: string; needsVerification?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error?: string; role?: AuthRole }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  loading: true,
  signUp: async () => ({}),
  signIn: async () => ({}),
  signOut: async () => {},
  refreshUser: async () => {},
});

function mapUser(supaUser: User): AuthUser {
  const meta = supaUser.user_metadata || {};
  const role = (meta.role as AuthRole) || "owner";
  return {
    id: supaUser.id,
    name: meta.name || supaUser.email?.split("@")[0] || "User",
    email: supaUser.email || "",
    phone: typeof meta.phone === "string" ? meta.phone : "",
    role: role === "super_admin" || role === "tenant" || role === "owner" ? role : "owner",
    propertyId: meta.property_id,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const { data: { user: latest } } = await supabase.auth.getUser();
    if (latest) {
      setUser(mapUser(latest));
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(mapUser(session.user));
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(mapUser(session.user));
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: string, session: Session | null) => {
        if (session?.user) {
          setUser(mapUser(session.user));
        } else {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string, role: AuthRole) => {
    if (role === "super_admin") {
      return { error: "Invalid signup role" };
    }
    const redirectUrl = typeof window !== "undefined"
      ? `${window.location.origin}/auth/callback`
      : "http://localhost:3000/auth/callback";

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role },
        emailRedirectTo: redirectUrl,
      },
    });
    if (error) return { error: error.message };

    // If session exists, email confirmation is disabled — user is signed in immediately
    if (data.session) {
      setUser(mapUser(data.session.user));

      // Link tenant record if role is tenant and owner already added them by email
      if (role === "tenant" && data.session.user) {
        await supabase
          .from("tenants")
          .update({ user_id: data.session.user.id })
          .eq("email", email)
          .is("user_id", null);
      }

      return {};
    }

    // No session means email confirmation is required
    return { needsVerification: true };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };

    // Link tenant record if not already linked
    if (data.session?.user) {
      const role = data.session.user.user_metadata?.role;
      if (role === "tenant") {
        await supabase
          .from("tenants")
          .update({ user_id: data.session.user.id })
          .eq("email", email)
          .is("user_id", null);
      }

      const mapped = mapUser(data.session.user);
      setUser(mapped);
      return { role: mapped.role };
    }

    return {};
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, user, loading, signUp, signIn, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
