"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  UserCog,
  Shield,
  X,
} from "lucide-react";

const navItems = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Properties", href: "/admin/properties", icon: Building2 },
  { label: "Owners", href: "/admin/owners", icon: UserCog },
];

interface AdminSidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function AdminSidebar({ mobileOpen, onMobileClose }: AdminSidebarProps) {
  const pathname = usePathname();

  const content = (
    <>
      <div className="p-6 border-b border-white/10 flex items-center justify-between">
        <Link href="/admin" className="flex items-center gap-2.5" onClick={onMobileClose}>
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
            <Shield size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight leading-none">ProManage</h1>
            <p className="text-[10px] uppercase tracking-wider text-violet-300 mt-0.5">Super Admin</p>
          </div>
        </Link>
        {onMobileClose && (
          <button onClick={onMobileClose} className="md:hidden p-1.5 text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        )}
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        <p className="px-6 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Platform
        </p>
        <ul className="space-y-0.5 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onMobileClose}
                  className={`relative flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${
                    isActive
                      ? "bg-violet-500/20 text-violet-100 shadow-sm"
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 w-[3px] h-5 rounded-r-full bg-violet-400" />
                  )}
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );

  return (
    <>
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 flex-col z-50 bg-gradient-to-b from-slate-950 via-slate-900 to-violet-950 text-slate-300">
        {content}
      </aside>
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={onMobileClose} />
          <aside className="relative w-72 max-w-[80vw] h-full flex flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-violet-950 text-slate-300">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
