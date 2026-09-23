"use client";

import { Plus, Search, AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Card, Chip, Button, Modal, useOverlayState } from "@heroui/react";
import EmptyState from "@/components/EmptyState";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useUserMode } from "@/lib/UserModeContext";
import { useAuth } from "@/lib/AuthContext";
import { useComplaints, Complaint } from "@/lib/ComplaintContext";
import ComplaintDetailModal from "@/components/complaints/ComplaintDetailModal";
import { SERVICE_TRADES, TRADE_LABELS, type ServiceTrade } from "@/lib/service-trades";
import { classifyComplaintCategory } from "@/lib/complaint-routing";
import { useRouter } from "next/navigation";

const statusIcons: Record<string, typeof AlertCircle> = {
  Open: AlertCircle,
  "In Progress": Clock,
  Resolved: CheckCircle2,
  Closed: CheckCircle2,
};

const statusColor: Record<string, "danger" | "warning" | "success" | "default"> = {
  Open: "danger",
  "In Progress": "warning",
  Resolved: "success",
  Closed: "default",
};

const priorityColor: Record<string, "danger" | "warning" | "success"> = {
  High: "danger",
  Medium: "warning",
  Low: "success",
};

export default function ComplaintsPage() {
  const { complaints, updateStatus, refetch } = useComplaints();
  const { t } = useLanguage();
  const { mode } = useUserMode();
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (mode === "owner") router.replace("/notifications");
  }, [mode, router]);

  const [statusFilter, setStatusFilter] = useState<"All" | "Open" | "In Progress" | "Resolved" | "Closed">("All");
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const modalState = useOverlayState();

  // New complaint form state
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState<"High" | "Medium" | "Low">("Medium");
  const [newCategory, setNewCategory] = useState<ServiceTrade | "">("");
  const [submittingComplaint, setSubmittingComplaint] = useState(false);
  const [tenantData, setTenantData] = useState<{ id: string; name: string; room: string } | null>(null);

  useEffect(() => {
    if (!user || mode !== "tenant") return;
    (async () => {
      const params = new URLSearchParams({ userId: user.id, email: user.email });
      const res = await fetch(`/api/tenant-data?${params}`);
      const data = await res.json();
      if (data.tenant) {
        setTenantData({
          id: data.tenant.id,
          name: data.tenant.name,
          room: data.tenant.room || "",
        });
      }
    })();
  }, [user, mode]);

  const handleSubmitComplaint = async () => {
    if (!newTitle.trim() || !user) return;
    setSubmittingComplaint(true);
    try {
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          title: newTitle.trim(),
          description: newDescription.trim(),
          priority: newPriority,
          category: newCategory || undefined,
        }),
      });
      if (res.ok) {
        // Refetch complaints to show the new one
        await refetch();
        setNewTitle("");
        setNewDescription("");
        setNewPriority("Medium");
        setNewCategory("");
        modalState.close();
      }
    } finally {
      setSubmittingComplaint(false);
    }
  };

  const baseData = mode === "tenant"
    ? complaints.filter((c) => c.tenantId === tenantData?.id)
    : complaints;

  const filtered = baseData.filter(
    (c) => statusFilter === "All" || c.status === statusFilter
  );

  const openCount = baseData.filter((c) => c.status === "Open").length;
  const inProgressCount = baseData.filter((c) => c.status === "In Progress").length;

  const detectedNewCategory = useMemo(
    () => classifyComplaintCategory(newTitle, newDescription),
    [newTitle, newDescription]
  );

  return (
    <div className="space-y-4 sm:space-y-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">{t("complaints.title")}</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1">
            <span className="text-red-600 font-medium">{openCount} {t("complaints.open")}</span> &middot;{" "}
            <span className="text-amber-600 font-medium">{inProgressCount} {t("complaints.inProgress")}</span> &middot;{" "}
            {baseData.length} {t("common.total")}
          </p>
        </div>
        {mode === "tenant" && (
          <Button variant="primary" size="sm" onPress={() => modalState.open()}>
            <Plus size={14} />
            <span className="hidden sm:inline">{t("complaints.logComplaint")}</span>
            <span className="sm:hidden">New</span>
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t("complaints.searchPlaceholder")}
            className="w-full pl-9 pr-4 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
          />
        </div>
        <div className="flex gap-1 sm:gap-1.5 bg-slate-100 p-1 rounded-lg overflow-x-auto">
          {(["All", "Open", "In Progress", "Resolved"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-2.5 sm:px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                statusFilter === f ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {f === "All" ? t("common.all") : f === "Open" ? t("status.open") : f === "In Progress" ? t("status.inProgress") : t("status.resolved")}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={t("complaints.noComplaints")} description={t("complaints.noComplaintsDesc")} />
      ) : (
        <div className="space-y-3">
          {filtered.map((complaint, i) => {
            const StatusIcon = statusIcons[complaint.status] || AlertCircle;
            return (
              <Card
                key={complaint.id}
                className="card-hover stagger-item cursor-pointer"
                style={{ animationDelay: `${i * 60}ms` }}
                onClick={() => setSelectedComplaint(complaint)}
              >
                <Card.Content className="p-3.5 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2.5 sm:gap-0">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className={`p-2 sm:p-2.5 rounded-xl shrink-0 ${complaint.priority === "High" ? "bg-red-50" : complaint.priority === "Medium" ? "bg-amber-50" : "bg-emerald-50"}`}>
                        <StatusIcon size={16} className={complaint.status === "Open" ? "text-red-500" : complaint.status === "In Progress" ? "text-amber-500" : "text-emerald-500"} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-semibold text-slate-900">{complaint.title}</h4>
                        <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 line-clamp-2">{complaint.description}</p>
                        <div className="flex items-center gap-2 sm:gap-3 mt-1.5 sm:mt-2 flex-wrap">
                          <span className="text-[11px] sm:text-xs text-slate-600">{complaint.tenant} &middot; {t("common.room")} {complaint.room}</span>
                          <Chip size="sm" variant="soft" className="text-indigo-700 bg-indigo-50">
                            {TRADE_LABELS[complaint.category || "general"]}
                          </Chip>
                          {complaint.approvalStatus === "pending" && (
                            <span className="text-[10px] text-amber-600">Awaiting owner approval</span>
                          )}
                          {complaint.vendorName && complaint.approvalStatus === "approved" && (
                            <span className="text-[10px] text-emerald-600">→ {complaint.vendorName}</span>
                          )}
                          <span className="text-[10px] sm:text-[11px] text-slate-400">{complaint.time}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 ml-9 sm:ml-0 flex-wrap">
                      <Chip size="sm" variant="soft" color={priorityColor[complaint.priority]}>
                        {complaint.priority === "High" ? t("priority.high") : complaint.priority === "Medium" ? t("priority.medium") : t("priority.low")}
                      </Chip>
                      <Chip size="sm" variant="soft" color={statusColor[complaint.status]}>
                        {complaint.status === "Open" ? t("status.open") : complaint.status === "In Progress" ? t("status.inProgress") : t("status.resolved")}
                      </Chip>
                      {mode === "owner" && complaint.status !== "Resolved" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const next = complaint.status === "Open" ? "In Progress" : "Resolved";
                            updateStatus(complaint.id, next);
                          }}
                          className="px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          {complaint.status === "Open" ? "Start" : "Resolve"}
                        </button>
                      )}
                    </div>
                  </div>
                </Card.Content>
              </Card>
            );
          })}
        </div>
      )}

      {selectedComplaint && (
        <ComplaintDetailModal
          complaint={selectedComplaint}
          onClose={() => setSelectedComplaint(null)}
        />
      )}

      {modalState.isOpen && (
        <Modal state={modalState}>
          <Modal.Backdrop variant="blur">
            <Modal.Container size="md" placement="center">
              <Modal.Dialog aria-label="Log Complaint">
                <Modal.Header>
                  <Modal.Heading>{t("complaints.logNewComplaint")}</Modal.Heading>
                </Modal.Header>
                <Modal.Body>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t("complaints.complaintTitle")}</label>
                      <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="Brief description of the issue"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t("complaints.description")}</label>
                      <textarea
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                        placeholder="Detailed description..."
                        rows={3}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Issue type (optional)</label>
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value as ServiceTrade | "")}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      >
                        <option value="">Auto-detect: {TRADE_LABELS[detectedNewCategory]}</option>
                        {SERVICE_TRADES.map((trade) => (
                          <option key={trade} value={trade}>
                            {TRADE_LABELS[trade]}
                          </option>
                        ))}
                      </select>
                      {newTitle.trim() && (
                        <p className="mt-1.5 text-xs text-indigo-700">
                          Will be routed as{" "}
                          <span className="font-semibold">
                            {TRADE_LABELS[newCategory || detectedNewCategory]}
                          </span>
                          {newCategory ? "" : " (auto-detected)"}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t("complaints.priority")}</label>
                      <select
                        value={newPriority}
                        onChange={(e) => setNewPriority(e.target.value as "High" | "Medium" | "Low")}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      >
                        <option value="High">{t("priority.high")}</option>
                        <option value="Medium">{t("priority.medium")}</option>
                        <option value="Low">{t("priority.low")}</option>
                      </select>
                    </div>
                  </div>
                </Modal.Body>
                <Modal.Footer className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onPress={() => modalState.close()}>{t("common.cancel")}</Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onPress={handleSubmitComplaint}
                    isDisabled={!newTitle.trim() || submittingComplaint}
                  >
                    {submittingComplaint ? "Submitting..." : t("complaints.submitComplaint")}
                  </Button>
                </Modal.Footer>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      )}
    </div>
  );
}
