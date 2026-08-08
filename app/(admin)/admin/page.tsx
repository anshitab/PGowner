"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-api";
import {
  Building2,
  Users,
  UserCog,
  IndianRupee,
  MessageSquareWarning,
  BadgeCheck,
  Clock3,
} from "lucide-react";
import Link from "next/link";

interface OverviewData {
  stats: {
    properties: number;
    verifiedProperties: number;
    pendingProperties: number;
    owners: number;
    tenants: number;
    activeTenants: number;
    payments: number;
    totalRevenue: number;
    pendingRentAmount: number;
    openComplaints: number;
    complaints: number;
  };
  recentActivity: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    actor: string;
    created_at: string;
  }>;
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await adminFetch<OverviewData>("/api/admin/overview");
      if (res.error) setError(res.error);
      else setData(res.data || null);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 text-red-700 px-4 py-3 text-sm">
        {error || "Failed to load overview"}
      </div>
    );
  }

  const { stats } = data;
  const cards: Array<{
    label: string;
    value: string | number;
    sub: string;
    icon: typeof Building2;
    href?: string;
    color: string;
  }> = [
    { label: "Properties", value: stats.properties, sub: `${stats.verifiedProperties} verified`, icon: Building2, href: "/admin/properties", color: "bg-blue-50 text-blue-600" },
    { label: "Pending verification", value: stats.pendingProperties, sub: "Needs review", icon: BadgeCheck, href: "/admin/properties?status=pending", color: "bg-amber-50 text-amber-600" },
    { label: "Owners", value: stats.owners, sub: "PG accounts", icon: UserCog, href: "/admin/owners", color: "bg-violet-50 text-violet-600" },
    { label: "Tenants", value: stats.tenants, sub: `${stats.activeTenants} active`, icon: Users, color: "bg-emerald-50 text-emerald-600" },
    { label: "Revenue collected", value: `₹${stats.totalRevenue.toLocaleString("en-IN")}`, sub: `${stats.payments} payments`, icon: IndianRupee, color: "bg-indigo-50 text-indigo-600" },
    { label: "Open complaints", value: stats.openComplaints, sub: `${stats.complaints} total`, icon: MessageSquareWarning, color: "bg-rose-50 text-rose-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Platform overview</h1>
        <p className="text-sm text-slate-500 mt-1">Manage properties and PG owners across the platform</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          const className = "rounded-2xl border border-slate-200 bg-white p-5";
          const body = (
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">{card.label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{card.value}</p>
                <p className="text-xs text-slate-400 mt-1">{card.sub}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.color}`}>
                <Icon size={18} />
              </div>
            </div>
          );

          if (card.href) {
            return (
              <Link key={card.label} href={card.href} className={`${className} hover:shadow-md transition-shadow`}>
                {body}
              </Link>
            );
          }

          return (
            <div key={card.label} className={className}>
              {body}
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Clock3 size={16} className="text-slate-400" />
          <h2 className="font-semibold text-slate-900">Recent activity</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {data.recentActivity.length === 0 ? (
            <p className="px-5 py-8 text-sm text-slate-500 text-center">No recent activity</p>
          ) : (
            data.recentActivity.map((item) => (
              <div key={item.id} className="px-5 py-3.5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-800">{item.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                  <p className="text-[11px] text-slate-400 mt-1">{item.actor}</p>
                </div>
                <p className="text-[11px] text-slate-400 whitespace-nowrap">
                  {new Date(item.created_at).toLocaleString("en-IN", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4 text-sm text-amber-800">
        Pending rent across platform: <strong>₹{stats.pendingRentAmount.toLocaleString("en-IN")}</strong>
      </div>
    </div>
  );
}
