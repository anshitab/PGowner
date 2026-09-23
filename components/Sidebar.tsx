"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  DoorOpen,
  Users,
  IndianRupee,
  CreditCard,
  MessageSquareWarning,
  Bell,
  FileBarChart,
  Settings,
  Megaphone,
  Wallet,
  Home,
  FileText,
  HelpCircle,
  X,
  UtensilsCrossed,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useUserMode } from "@/lib/UserModeContext";
import { useSettings } from "@/lib/SettingsContext";

interface NavItem {
  key: string;
  icon: string;
  href: string;
  ownerOnly?: boolean;
  tenantOnly?: boolean;
  requiresFood?: boolean;
}

const allNavItems: NavItem[] = [
  { key: "nav.dashboard", icon: "LayoutDashboard", href: "/dashboard" },
  { key: "nav.properties", icon: "Building2", href: "/properties", ownerOnly: true },
  { key: "nav.rooms", icon: "DoorOpen", href: "/rooms", ownerOnly: true },
  { key: "nav.tenants", icon: "Users", href: "/tenants", ownerOnly: true },
  { key: "nav.rent", icon: "IndianRupee", href: "/rent", ownerOnly: true },
  { key: "nav.payments", icon: "CreditCard", href: "/payments", ownerOnly: true },
  { key: "nav.notifications", icon: "Bell", href: "/notifications", ownerOnly: true },
  { key: "nav.foodMenu", icon: "UtensilsCrossed", href: "/food-menu", requiresFood: true },
  { key: "nav.complaints", icon: "MessageSquareWarning", href: "/complaints", tenantOnly: true },
  { key: "nav.myRoom", icon: "Home", href: "/my-room", tenantOnly: true },
];

const icons: Record<string, React.ComponentType<{ size?: number }>> = {
  LayoutDashboard,
  Building2,
  DoorOpen,
  Users,
  IndianRupee,
  CreditCard,
  MessageSquareWarning,
  Bell,
  FileBarChart,
  Megaphone,
  Wallet,
  Home,
  FileText,
  HelpCircle,
  UtensilsCrossed,
};

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { mode } = useUserMode();
  const { settings, loading: settingsLoading } = useSettings();

  const roleFiltered =
    mode === "owner"
      ? allNavItems.filter((item) => !item.tenantOnly)
      : allNavItems.filter((item) => !item.ownerOnly);

  const navItems = settingsLoading
    ? roleFiltered
    : roleFiltered.filter((item) => !item.requiresFood || settings.foodIncluded);

  const isTenant = mode === "tenant";

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5" onClick={onMobileClose}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--teal)]">
            {isTenant ? <Home size={15} className="text-white" /> : <Building2 size={15} className="text-white" />}
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-lg font-semibold tracking-tight text-white">
              ProManage
            </h1>
            {isTenant && (
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--mist)]">
                Tenant
              </p>
            )}
          </div>
        </Link>
        {onMobileClose && (
          <button
            onClick={onMobileClose}
            className="p-1.5 text-[var(--sidebar-text)] hover:text-white md:hidden"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <p className="mb-2 px-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
          {t("nav.main")}
        </p>
        <ul className="space-y-0.5 px-2">
          {navItems.map((item) => {
            const Icon = icons[item.icon];
            const isActive = pathname === item.href;
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  onClick={onMobileClose}
                  className={`relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-white/10 text-[var(--sidebar-active)]"
                      : "text-[var(--sidebar-text)] hover:bg-white/5 hover:text-white/90"
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 h-5 w-[3px] rounded-r-full bg-[var(--teal)]" />
                  )}
                  {Icon && <Icon size={18} />}
                  <span>{t(item.key)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="space-y-0.5 border-t border-white/10 p-2">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
          {t("nav.system")}
        </p>
        <Link
          href="/settings"
          onClick={onMobileClose}
          className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition ${
            pathname === "/settings"
              ? "bg-white/10 text-[var(--sidebar-active)]"
              : "text-[var(--sidebar-text)] hover:bg-white/5 hover:text-white/90"
          }`}
        >
          <Settings size={18} />
          <span>{t("nav.settings")}</span>
        </Link>
      </div>
    </>
  );

  return (
    <>
      <aside className="fixed left-0 top-0 z-50 hidden h-screen w-64 flex-col bg-[var(--sidebar-bg)] text-[var(--sidebar-text)] md:flex">
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={onMobileClose} />
          <aside className="relative flex h-full w-72 max-w-[80vw] flex-col bg-[var(--sidebar-bg)] text-[var(--sidebar-text)]">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
