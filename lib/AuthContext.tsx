"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "./supabase";
import type { User, Session } from "@supabase/supabase-js";

export type AuthRole = "owner" | "tenant";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: AuthRole;
  propertyId?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthUser | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string, role: AuthRole) => Promise<{ error?: string; needsVerification?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  loading: true,
  signUp: async () => ({}),
  signIn: async () => ({}),
  signOut: async () => {},
});

function mapUser(supaUser: User): AuthUser {
  const meta = supaUser.user_metadata || {};
  return {
    id: supaUser.id,
    name: meta.name || supaUser.email?.split("@")[0] || "User",
    email: supaUser.email || "",
    role: (meta.role as AuthRole) || "owner",
    propertyId: meta.property_id,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

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
    }

    return {};
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
