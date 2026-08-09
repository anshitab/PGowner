"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { LogOut, Menu, Shield } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, loading, signOut } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.replace("/login?role=owner");
      return;
    }
    if (user?.role !== "super_admin") {
      router.replace("/dashboard");
    }
  }, [loading, isAuthenticated, user, router]);

  if (loading || !isAuthenticated || user?.role !== "super_admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
      </div>
    );
  }

  const handleLogout = async () => {
    await signOut();
    router.replace("/");
  };

  return (
    <>
      <AdminSidebar mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />
      <div className="md:ml-64 min-h-screen flex flex-col bg-slate-50">
        <header className="h-14 sm:h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/60 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Shield size={16} className="text-violet-600" />
              <span className="font-medium">Platform Control</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-slate-800">{user.name}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
              title="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </>
  );
}
