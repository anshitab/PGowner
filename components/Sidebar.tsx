"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  DoorOpen,
  Users,
  IndianRupee,
  UserPlus,
  CreditCard,
  MessageSquareWarning,
  FileBarChart,
  Bell,
  Settings,
  Megaphone,
  Wallet,
  Home,
  FileText,
  HelpCircle,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useUserMode } from "@/lib/UserModeContext";

interface NavItem {
  key: string;
  icon: string;
  href: string;
  ownerOnly?: boolean;
  tenantOnly?: boolean;
}

const allNavItems: NavItem[] = [
  { key: "nav.dashboard", icon: "LayoutDashboard", href: "/dashboard" },
  { key: "nav.properties", icon: "Building2", href: "/properties", ownerOnly: true },
  { key: "nav.rooms", icon: "DoorOpen", href: "/rooms", ownerOnly: true },
  { key: "nav.tenants", icon: "Users", href: "/tenants", ownerOnly: true },
  { key: "nav.rent", icon: "IndianRupee", href: "/rent" },
  { key: "nav.visitors", icon: "UserPlus", href: "/visitors", ownerOnly: true },
  { key: "nav.payments", icon: "CreditCard", href: "/payments", ownerOnly: true },
  { key: "nav.complaints", icon: "MessageSquareWarning", href: "/complaints" },
  { key: "nav.myRoom", icon: "Home", href: "/my-room", tenantOnly: true },
  { key: "nav.documents", icon: "FileText", href: "/documents", tenantOnly: true },
];

const icons: Record<string, React.ComponentType<{ size?: number }>> = {
  LayoutDashboard,
  Building2,
  DoorOpen,
  Users,
  IndianRupee,
  UserPlus,
  CreditCard,
  MessageSquareWarning,
  FileBarChart,
  Megaphone,
  Wallet,
  Home,
  FileText,
  HelpCircle,
};

export default function Sidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { mode } = useUserMode();

  const navItems = mode === "owner"
    ? allNavItems.filter((item) => !item.tenantOnly)
    : allNavItems.filter((item) => !item.ownerOnly);

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-[var(--sidebar-bg)] text-[var(--sidebar-text)] flex flex-col z-50">
      <div className="p-6 border-b border-white/10">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Building2 size={16} className="text-white" />
          </div>
          <h1 className="text-lg font-bold text-white tracking-tight">ProManage</h1>
        </Link>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        <p className="px-6 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          {t("nav.main")}
        </p>
        <ul className="space-y-0.5 px-3">
          {navItems.map((item) => {
            const Icon = icons[item.icon];
            const isActive = pathname === item.href;
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${
                    isActive
                      ? "bg-white/10 text-white shadow-sm"
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 w-[3px] h-5 bg-blue-500 rounded-r-full" />
                  )}
                  {Icon && <Icon size={18} />}
                  <span>{t(item.key)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-white/10 p-3 space-y-0.5">
        <p className="px-4 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          {t("nav.system")}
        </p>
        {mode === "owner" && (
          <Link
            href="/notifications"
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${
              pathname === "/notifications"
                ? "bg-white/10 text-white"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
            }`}
          >
            <Bell size={18} />
            <span>{t("nav.notifications")}</span>
            <span className="ml-auto w-5 h-5 rounded-full bg-blue-600 text-[10px] font-bold text-white flex items-center justify-center">
              3
            </span>
          </Link>
        )}
        <Link
          href="/settings"
          className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${
            pathname === "/settings"
              ? "bg-white/10 text-white"
              : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
          }`}
        >
          <Settings size={18} />
          <span>{t("nav.settings")}</span>
        </Link>
      </div>
    </aside>
  );
}
