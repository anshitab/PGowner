"use client";

import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import CommandPalette from "@/components/CommandPalette";
import PageTransition from "@/components/PageTransition";
import { useAuth } from "@/lib/AuthContext";
import { usePropertyContext } from "@/lib/PropertyContext";
import { useUserMode } from "@/lib/UserModeContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DashboardLoading from "@/components/DashboardLoading";
import DemoGuideBanner from "@/components/DemoGuideBanner";
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auto-link tenant by email if not yet linked by user_id
  useEffect(() => {
    async function autoLinkTenant() {
      if (mode !== "tenant" || !user?.email) return;

      const { data: byUserId } = await supabase
        .from("tenants")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (byUserId) return;

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
      }
    }

    if (!authLoading && isAuthenticated) {
      autoLinkTenant();
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
    }
  }, [isAuthenticated, authLoading, propLoading, property, mode, router, user]);

  if (authLoading || propLoading) {
    return <DashboardLoading />;
  }
  if (!isAuthenticated) return null;
  if (mode === "owner" && !property) return null;

  return (
    <>
      <Sidebar mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />
      <div className="md:ml-64 min-h-screen flex flex-col">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 sm:p-6">
          <DemoGuideBanner />
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
      <CommandPalette />
    </>
  );
}
