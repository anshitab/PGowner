"use client";

import Link from "next/link";
import { X, Sparkles, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useUserMode } from "@/lib/UserModeContext";
import { useSettings } from "@/lib/SettingsContext";
import { isDemoUserEmail } from "@/lib/demo-accounts";

const STORAGE_KEY = "pgowner_demo_guide_dismissed";

export default function DemoGuideBanner() {
  const { user } = useAuth();
  const { mode } = useUserMode();
  const { settings } = useSettings();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user?.email || !isDemoUserEmail(user.email)) return;
    if (localStorage.getItem(STORAGE_KEY) === "1") return;
    setVisible(true);
  }, [user?.email]);

  if (!visible) return null;

  const ownerSteps = [
    { href: "/notifications", label: "Approve a tenant complaint", hint: "Try “Approve & assign” on the leak request" },
    { href: settings.foodIncluded ? "/food-menu" : "/settings", label: "Weekly food menu", hint: settings.foodIncluded ? "Edit meals for the week" : "Enable “PG with food” in Settings" },
    { href: "/tenants", label: "Tenants & rooms", hint: "Sample occupancy and rent data" },
  ];

  const tenantSteps = [
    { href: "/complaints", label: "Log or track complaints", hint: "See status after owner approval" },
    ...(settings.foodIncluded
      ? [{ href: "/food-menu", label: "Today’s meals", hint: "Breakfast, lunch, dinner" }]
      : []),
    { href: "/my-room", label: "My room & rent", hint: "Your stay details in one place" },
  ];

  const steps = mode === "owner" ? ownerSteps : tenantSteps;

  return (
    <div className="mb-6 rounded-xl border border-[var(--teal)]/25 bg-gradient-to-r from-[var(--teal)]/8 to-[var(--surface)] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--teal)] text-white">
            <Sparkles size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--ink)]">Welcome to the ProManage demo</p>
            <p className="mt-1 text-xs text-[var(--muted)] leading-relaxed max-w-xl">
              Everything here is sample data—click through a few spots to see how owners and tenants work day to day.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            localStorage.setItem(STORAGE_KEY, "1");
            setVisible(false);
          }}
          className="rounded-md p-1.5 text-[var(--muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--ink)]"
          aria-label="Dismiss demo guide"
        >
          <X size={16} />
        </button>
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-3">
        {steps.map((step) => (
          <li key={step.href}>
            <Link
              href={step.href}
              className="group flex h-full flex-col rounded-lg border border-[var(--line)] bg-[var(--surface)]/80 px-3 py-2.5 transition hover:border-[var(--teal)]/40 hover:shadow-sm"
            >
              <span className="flex items-center justify-between text-xs font-medium text-[var(--ink)]">
                {step.label}
                <ArrowRight size={12} className="text-[var(--teal)] opacity-0 transition group-hover:opacity-100" />
              </span>
              <span className="mt-1 text-[10px] text-[var(--muted)] leading-snug">{step.hint}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
