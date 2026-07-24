"use client";

import { supabase } from "@/lib/supabase";
import { usePropertyContext } from "@/lib/PropertyContext";
import {
  IndianRupee, AlertCircle, UserCheck, AlertTriangle, Info, CheckCircle2, Bell,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Card, Button, Switch } from "@heroui/react";
import EmptyState from "@/components/EmptyState";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useUserMode } from "@/lib/UserModeContext";
import { useRouter } from "next/navigation";

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: "payment" | "complaint" | "visitor" | "warning" | "info" | "success";
  read: boolean;
  tenantId: string | null;
}

const typeIcons = {
  payment: IndianRupee,
  complaint: AlertCircle,
  visitor: UserCheck,
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle2,
};

const typeColors = {
  payment: "bg-emerald-50 text-emerald-600",
  complaint: "bg-red-50 text-red-600",
  visitor: "bg-blue-50 text-blue-600",
  warning: "bg-amber-50 text-amber-600",
  info: "bg-slate-100 text-slate-600",
  success: "bg-emerald-50 text-emerald-600",
};

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
  const [showUnread, setShowUnread] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();
  const { mode } = useUserMode();
  const router = useRouter();
  const { propertyId } = usePropertyContext();

  useEffect(() => {
    if (mode === "tenant") router.replace("/dashboard");
  }, [mode, router]);

  useEffect(() => {
    async function fetchNotifications() {
      if (!propertyId) {
        setNotifications([]);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("activity_log")
        .select("*")
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (data) {
        setNotifications(
          data.map((row) => ({
            id: row.id,
            title: row.title || "",
            message: row.message || "",
            time: getRelativeTime(row.created_at),
            type: (row.type || "info") as Notification["type"],
            read: row.read ?? true,
            tenantId: row.tenant_id || null,
          }))
        );
      }
      setLoading(false);
    }

    fetchNotifications();
  }, [propertyId]);

  const baseData = mode === "tenant"
    ? notifications.filter((n) => n.tenantId != null)
    : notifications;

  const filtered = showUnread
    ? baseData.filter((n) => !n.read)
    : baseData;

  const unreadCount = baseData.filter((n) => !n.read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-slate-500">Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t("notifications.title")}</h2>
          <p className="text-sm text-slate-500 mt-1">
            <span className="text-blue-600 font-medium">{unreadCount} {t("notifications.unread")}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Switch isSelected={showUnread} onChange={setShowUnread} size="sm">
            <Switch.Content>
              <span className="text-sm text-slate-600">{t("notifications.unreadOnly")}</span>
            </Switch.Content>
          </Switch>
          <Button variant="outline" size="sm">
            {t("common.markAllRead")}
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Bell size={48} strokeWidth={1.5} />}
          title={t("notifications.allCaughtUp")}
          description={t("notifications.allCaughtUpDesc")}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((notification, i) => {
            const Icon = typeIcons[notification.type] || Info;
            const colorClass = typeColors[notification.type] || typeColors.info;
            return (
              <Card
                key={notification.id}
                className={`stagger-item transition-all ${!notification.read ? "ring-1 ring-blue-200 bg-blue-50/20" : ""}`}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <Card.Content className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-xl ${colorClass}`}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-4">
                        <h4 className="text-sm font-semibold text-slate-900 truncate">{notification.title}</h4>
                        <span className="text-[11px] text-slate-400 shrink-0">{notification.time}</span>
                      </div>
                      <p className="text-sm text-slate-600 mt-0.5">{notification.message}</p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0" />
                    )}
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
