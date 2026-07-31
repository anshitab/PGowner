"use client";

import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import CommandPalette from "@/components/CommandPalette";
import { useAuth } from "@/lib/AuthContext";
import { usePropertyContext } from "@/lib/PropertyContext";
import { useUserMode } from "@/lib/UserModeContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { property, loading: propLoading } = usePropertyContext();
  const { mode } = useUserMode();
  const router = useRouter();
  const pathname = usePathname();
  const [tenantLinked, setTenantLinked] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkTenantLink() {
      if (mode !== "tenant" || !user) {
        setTenantLinked(true);
        return;
      }

      // Check if tenant record is linked by user_id
      const { data: byUserId } = await supabase
        .from("tenants")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (byUserId) {
        setTenantLinked(true);
        return;
      }

      // Fallback: try email match and auto-link
      if (user.email) {
        const { data: byEmail } = await supabase
          .from("tenants")
          .select("id")
          .eq("email", user.email)
          .is("user_id", null)
          .maybeSingle();

        if (byEmail) {
          await supabase
            .from("tenants")
            .update({ user_id: user.id })
            .eq("id", byEmail.id);
          setTenantLinked(true);
          return;
        }
      }

      setTenantLinked(false);
    }

    if (!authLoading && isAuthenticated) {
      checkTenantLink();
    }
  }, [authLoading, isAuthenticated, mode, user]);

  useEffect(() => {
    if (authLoading || propLoading) return;
    if (!isAuthenticated) {
      router.replace("/");
      return;
    }
    if (mode === "owner" && !property) {
      router.replace("/setup");
      return;
    }
    if (mode === "tenant" && tenantLinked === false && pathname !== "/tenant-onboarding") {
      router.replace("/tenant-onboarding");
    }
  }, [isAuthenticated, authLoading, propLoading, property, mode, router, tenantLinked, pathname]);

  if (authLoading || propLoading) return null;
  if (!isAuthenticated) return null;
  if (mode === "owner" && !property) return null;
  if (mode === "tenant" && tenantLinked === null) return null;

  return (
    <>
      <Sidebar />
      <div className="ml-64 min-h-screen flex flex-col">
        <TopBar />
        <main className="flex-1 p-6 page-enter">{children}</main>
      </div>
      <CommandPalette />
    </>
  );
}
