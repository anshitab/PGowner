"use client";

import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import CommandPalette from "@/components/CommandPalette";
import { useAuth } from "@/lib/AuthContext";
import { usePropertyContext } from "@/lib/PropertyContext";
import { useUserMode } from "@/lib/UserModeContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { property, loading: propLoading } = usePropertyContext();
  const { mode } = useUserMode();
  const router = useRouter();

  useEffect(() => {
    if (authLoading || propLoading) return;
    if (!isAuthenticated) {
      router.replace("/");
      return;
    }
    if (mode === "owner" && !property) {
      router.replace("/setup");
    }
  }, [isAuthenticated, authLoading, propLoading, property, mode, router]);

  if (authLoading || propLoading) return null;
  if (!isAuthenticated) return null;
  if (mode === "owner" && !property) return null;

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
