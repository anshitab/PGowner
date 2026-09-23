"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bell, DoorOpen, AlertCircle, CheckCircle2, Clock,
} from "lucide-react";
import { Card, Chip, Button } from "@heroui/react";
import EmptyState from "@/components/EmptyState";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useUserMode } from "@/lib/UserModeContext";
import { usePropertyContext } from "@/lib/PropertyContext";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { TRADE_LABELS, type ServiceTrade } from "@/lib/service-trades";

interface NotificationItem {
  id: string;
  type: "checkout" | "complaint";
  title: string;
  description: string;
  tenant: string;
  room: string;
  time: string;
  status: string;
  priority?: string;
  category?: string;
  approvalStatus?: string;
  assignedTo?: string;
  vendor?: { name: string; phone: string; trade: string } | null;
  createdAt: string;
}

function getRelativeTime(timestamp: string): string {
  if (!timestamp) return "";
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationsPage() {
  const { t } = useLanguage();
  const { mode } = useUserMode();
  const { propertyId } = usePropertyContext();
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"All" | "checkout" | "complaint">("All");
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  useEffect(() => {
    if (mode === "tenant") router.replace("/dashboard");
  }, [mode, router]);

  const fetchNotifications = useCallback(async () => {
    if (!propertyId) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const res = await fetch(`/api/notifications?property_id=${propertyId}`);
    const data = await res.json();

    if (Array.isArray(data)) {
      setNotifications(data.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        description: n.description,
        tenant: n.tenant,
        room: n.room,
        time: getRelativeTime(n.created_at),
        status: n.status,
        priority: n.priority,
        category: n.category,
        approvalStatus: n.approval_status,
        assignedTo: n.assigned_to,
        vendor: n.vendor,
        createdAt: n.created_at,
      })));
    }
    setLoading(false);
  }, [propertyId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleApprove = async (item: NotificationItem) => {
    setApprovingId(item.id);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        toast.error("Please sign in again");
        return;
      }
      const res = await fetch("/api/complaints/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ complaintId: item.id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error || "Could not approve complaint");
        return;
      }
      toast.success(
        body.vendor?.name
          ? `Assigned to ${body.vendor.name}${body.emailSent ? " (email sent)" : ""}`
          : "Complaint approved and assigned"
      );
      await fetchNotifications();
    } finally {
      setApprovingId(null);
    }
  };

  const handleResolve = async (item: NotificationItem) => {
    setResolvingId(item.id);
    try {
      await fetch("/api/notifications/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, type: item.type }),
      });
      setNotifications((prev) =>
        prev.map((n) => n.id === item.id ? { ...n, status: item.type === "complaint" ? "Resolved" : "completed" } : n)
      );
    } finally {
      setResolvingId(null);
    }
  };

  const filtered = filter === "All"
    ? notifications
    : notifications.filter((n) => n.type === filter);

  const activeCount = notifications.filter((n) =>
    n.type === "complaint" ? n.status !== "Resolved" : n.status !== "completed"
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-slate-500">Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">Notifications</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            <span className="text-blue-600 font-medium">{activeCount} active</span> &middot; {notifications.length} total
          </p>
        </div>
      </div>

      <div className="flex gap-1.5 bg-slate-100 p-1 rounded-lg w-fit">
        {(["All", "checkout", "complaint"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              filter === f ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {f === "All" ? "All" : f === "checkout" ? "Checkouts" : "Complaints"}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Bell size={48} strokeWidth={1.5} />}
          title="No notifications"
          description="You're all caught up! Checkout requests and complaints will appear here."
        />
      ) : (
        <div className="space-y-2.5">
          {filtered.map((item, i) => {
            const isResolved = item.type === "complaint" ? item.status === "Resolved" : item.status === "completed";
            return (
              <Card
                key={item.id}
                className={`stagger-item transition-all ${isResolved ? "opacity-60" : ""}`}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <Card.Content className="p-4">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className={`p-2 rounded-xl shrink-0 ${
                      item.type === "checkout" ? "bg-amber-50" : item.priority === "High" ? "bg-red-50" : item.priority === "Medium" ? "bg-amber-50" : "bg-emerald-50"
                    }`}>
                      {item.type === "checkout" ? (
                        <DoorOpen size={16} className="text-amber-600" />
                      ) : (
                        <AlertCircle size={16} className={item.priority === "High" ? "text-red-500" : item.priority === "Medium" ? "text-amber-500" : "text-emerald-500"} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-semibold text-slate-900">{item.title}</h4>
                            <Chip size="sm" variant="soft" color={item.type === "checkout" ? "warning" : "danger"}>
                              {item.type === "checkout" ? "Checkout" : "Complaint"}
                            </Chip>
                          </div>
                          <p className="text-xs text-slate-600 mt-1">{item.description}</p>
                          {item.type === "complaint" && (
                            <p className="text-[11px] text-indigo-600 mt-1">
                              Issue type: {TRADE_LABELS[(item.category as ServiceTrade) || "general"]}
                              {item.approvalStatus === "pending" ? " · awaiting your approval" : ""}
                            </p>
                          )}
                          {item.type === "complaint" && item.approvalStatus === "approved" && (item.vendor || item.assignedTo) && (
                            <p className="text-[11px] text-emerald-700 mt-1">
                              Assigned: {item.vendor?.name || item.assignedTo}
                              {item.vendor?.phone ? ` · ${item.vendor.phone}` : ""}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
                            <span>{item.tenant}</span>
                            <span>&middot;</span>
                            <span>Room {item.room}</span>
                            <span>&middot;</span>
                            <span>{item.time}</span>
                          </div>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          {isResolved ? (
                            <div className="flex items-center gap-1.5 text-emerald-600">
                              <CheckCircle2 size={16} />
                              <span className="text-xs font-medium">Resolved</span>
                            </div>
                          ) : item.type === "complaint" && item.approvalStatus === "pending" ? (
                            <Button
                              variant="primary"
                              size="sm"
                              onPress={() => handleApprove(item)}
                              isDisabled={approvingId === item.id}
                              className="bg-indigo-600"
                            >
                              {approvingId === item.id ? (
                                <Clock size={14} className="animate-spin" />
                              ) : (
                                <CheckCircle2 size={14} />
                              )}
                              <span className="ml-1">Approve & assign</span>
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onPress={() => handleResolve(item)}
                              isDisabled={resolvingId === item.id}
                              className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                            >
                              {resolvingId === item.id ? (
                                <Clock size={14} className="animate-spin" />
                              ) : (
                                <CheckCircle2 size={14} />
                              )}
                              <span className="ml-1">Resolve</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card.Content>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
