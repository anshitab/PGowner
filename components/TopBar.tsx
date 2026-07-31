"use client";

import { Search, LogOut, Menu } from "lucide-react";
import { Avatar, AvatarFallback } from "@heroui/react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { useUserMode } from "@/lib/UserModeContext";
import { useRouter } from "next/navigation";

interface TopBarProps {
  onMenuClick?: () => void;
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const { t } = useLanguage();
  const { user, signOut } = useAuth();
  const { mode } = useUserMode();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.replace("/");
  };

  const initials = user?.name
    .split(" ")
    .map((n) => n[0])
    .join("") || "U";

  return (
    <header className="h-14 sm:h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/60 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
        >
          <Menu size={20} />
        </button>
        {mode === "owner" && (
          <div className="relative group hidden sm:block">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-500"
            />
            <input
              type="text"
              placeholder={t("common.search")}
              readOnly
              onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
              onFocus={(e) => { e.target.blur(); window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true })); }}
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm w-full md:w-80 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 cursor-pointer"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium text-slate-400 bg-slate-100 border border-slate-200 rounded">
              ⌘K
            </kbd>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <Avatar size="sm">
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="hidden md:block">
          <p className="text-sm font-medium text-slate-800 leading-tight">
            {user?.name || "User"}
          </p>
          <p className="text-[11px] text-slate-500">
            {user?.role === "owner" ? t("mode.propertyManager") : t("mode.tenant")}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
          title="Logout"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
