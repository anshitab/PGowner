"use client";

import { useState } from "react";
import { Card, Chip } from "@heroui/react";
import {
  Activity, CreditCard, MessageSquareWarning, UserPlus, Megaphone,
  Users, Wallet, Wrench, BedDouble, LogOut, Filter, Trash2,
} from "lucide-react";
import { useActivity } from "@/lib/ActivityContext";

const typeConfig: Record<string, { icon: typeof Activity; color: string; bg: string }> = {
  payment: { icon: CreditCard, color: "text-emerald-600", bg: "bg-emerald-50" },
  complaint: { icon: MessageSquareWarning, color: "text-amber-600", bg: "bg-amber-50" },
  visitor: { icon: UserPlus, color: "text-blue-600", bg: "bg-blue-50" },
  announcement: { icon: Megaphone, color: "text-purple-600", bg: "bg-purple-50" },
  tenant_move: { icon: Users, color: "text-indigo-600", bg: "bg-indigo-50" },
  expense: { icon: Wallet, color: "text-orange-600", bg: "bg-orange-50" },
  maintenance: { icon: Wrench, color: "text-teal-600", bg: "bg-teal-50" },
  checkout: { icon: LogOut, color: "text-red-600", bg: "bg-red-50" },
  bed_transfer: { icon: BedDouble, color: "text-violet-600", bg: "bg-violet-50" },
};

const filterTabs = [
  { key: "all", label: "All" },
  { key: "payment", label: "Payments" },
  { key: "complaint", label: "Complaints" },
  { key: "visitor", label: "Visitors" },
  { key: "tenant_move", label: "Tenants" },
  { key: "maintenance", label: "Maintenance" },
  { key: "checkout", label: "Checkouts" },
  { key: "bed_transfer", label: "Beds" },
];

function formatTimestamp(ts: string) {
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function ActivityPage() {
  const { activities, filteredActivities, clearAll } = useActivity();
  const [filter, setFilter] = useState("all");

  const items = filteredActivities(filter);

  const grouped: Record<string, typeof items> = {};
  items.forEach((item) => {
    const date = new Date(item.timestamp).toLocaleDateString("en-IN", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(item);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Activity Center</h2>
          <p className="text-sm text-slate-500 mt-1">Track all actions across your property</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">{activities.length} total events</span>
          {activities.length > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
            >
              <Trash2 size={12} />
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Filter size={14} className="text-slate-400 shrink-0" />
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              filter === tab.key
                ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-sm"
                : "text-slate-500 hover:bg-slate-50 border border-transparent"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {items.length === 0 ? (
        <Card>
          <Card.Content className="p-12 text-center">
            <Activity size={40} className="mx-auto text-slate-200 mb-3" />
            <p className="text-sm text-slate-500">No activity recorded yet</p>
          </Card.Content>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([date, events]) => (
            <div key={date}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">{date}</p>
              <div className="relative pl-6 border-l-2 border-slate-100 space-y-4">
                {events.map((event) => {
                  const config = typeConfig[event.type] || { icon: Activity, color: "text-slate-600", bg: "bg-slate-50" };
                  const Icon = config.icon;
                  return (
                    <div key={event.id} className="relative group">
                      <div className={`absolute -left-[31px] w-5 h-5 rounded-full ${config.bg} flex items-center justify-center ring-2 ring-white`}>
                        <Icon size={11} className={config.color} />
                      </div>
                      <div className="p-4 bg-white border border-slate-100 rounded-xl hover:border-slate-200 hover:shadow-sm transition-all">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800">{event.title}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{event.description}</p>
                          </div>
                          <span className="text-[11px] text-slate-400 whitespace-nowrap shrink-0">
                            {formatTimestamp(event.timestamp)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Chip size="sm" variant="soft" color="default">
                            {event.actor}
                          </Chip>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
