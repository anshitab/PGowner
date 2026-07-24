"use client";

import { Plus, Search, AlertCircle, Clock, CheckCircle2, LayoutGrid, List } from "lucide-react";
import { useState } from "react";
import { Card, Chip, Button, Modal, useOverlayState } from "@heroui/react";
import EmptyState from "@/components/EmptyState";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useUserMode } from "@/lib/UserModeContext";
import { useAuth } from "@/lib/AuthContext";
import { useComplaints, Complaint } from "@/lib/ComplaintContext";
import KanbanBoard from "@/components/complaints/KanbanBoard";
import ComplaintDetailModal from "@/components/complaints/ComplaintDetailModal";

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
  const { complaints } = useComplaints();
  const { t } = useLanguage();
  const { mode } = useUserMode();
  const { user } = useAuth();

  const [view, setView] = useState<"kanban" | "list">(mode === "owner" ? "kanban" : "list");
  const [statusFilter, setStatusFilter] = useState<"All" | "Open" | "In Progress" | "Resolved" | "Closed">("All");
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const modalState = useOverlayState();

  const baseData = mode === "tenant"
    ? complaints.filter((c) => c.tenant === user?.name)
    : complaints;

  const filtered = baseData.filter(
    (c) => statusFilter === "All" || c.status === statusFilter
  );

  const openCount = baseData.filter((c) => c.status === "Open").length;
  const inProgressCount = baseData.filter((c) => c.status === "In Progress").length;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t("complaints.title")}</h2>
          <p className="text-sm text-slate-500 mt-1">
            <span className="text-red-600 font-medium">{openCount} {t("complaints.open")}</span> &middot;{" "}
            <span className="text-amber-600 font-medium">{inProgressCount} {t("complaints.inProgress")}</span> &middot;{" "}
            {baseData.length} {t("common.total")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {mode === "owner" && (
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setView("kanban")}
                className={`p-2 rounded-md transition-all ${view === "kanban" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
                title="Kanban View"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setView("list")}
                className={`p-2 rounded-md transition-all ${view === "list" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
                title="List View"
              >
                <List size={16} />
              </button>
            </div>
          )}
          <Button variant="primary" size="sm" onPress={() => modalState.open()}>
            <Plus size={14} />
            {t("complaints.logComplaint")}
          </Button>
        </div>
      </div>

      {view === "kanban" && mode === "owner" ? (
        <KanbanBoard onSelectComplaint={setSelectedComplaint} />
      ) : (
        <>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={t("complaints.searchPlaceholder")}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
              />
            </div>
            <div className="flex gap-1.5 bg-slate-100 p-1 rounded-lg">
              {(["All", "Open", "In Progress", "Resolved"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-all ${
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
                    <Card.Content className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className={`p-2.5 rounded-xl ${complaint.priority === "High" ? "bg-red-50" : complaint.priority === "Medium" ? "bg-amber-50" : "bg-emerald-50"}`}>
                            <StatusIcon size={18} className={complaint.status === "Open" ? "text-red-500" : complaint.status === "In Progress" ? "text-amber-500" : "text-emerald-500"} />
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-slate-900">{complaint.title}</h4>
                            <p className="text-xs text-slate-500 mt-1">{complaint.description}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-xs text-slate-600">{complaint.tenant} &middot; {t("common.room")} {complaint.room}</span>
                              <span className="text-[11px] text-slate-400">{complaint.time}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Chip size="sm" variant="soft" color={priorityColor[complaint.priority]}>
                            {complaint.priority === "High" ? t("priority.high") : complaint.priority === "Medium" ? t("priority.medium") : t("priority.low")}
                          </Chip>
                          <Chip size="sm" variant="soft" color={statusColor[complaint.status]}>
                            {complaint.status === "Open" ? t("status.open") : complaint.status === "In Progress" ? t("status.inProgress") : t("status.resolved")}
                          </Chip>
                        </div>
                      </div>
                    </Card.Content>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {selectedComplaint && (
        <ComplaintDetailModal
          complaint={selectedComplaint}
          onClose={() => setSelectedComplaint(null)}
        />
      )}

      {modalState.isOpen && (
        <Modal state={modalState}>
          <Modal.Backdrop isDismissable variant="blur" onClick={() => modalState.close()}>
            <Modal.Container size="md" placement="center">
              <Modal.Dialog aria-label="Log Complaint">
                <Modal.Header>
                  <Modal.Heading>{t("complaints.logNewComplaint")}</Modal.Heading>
                </Modal.Header>
                <Modal.Body>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t("complaints.complaintTitle")}</label>
                      <input type="text" placeholder="Brief description of the issue" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t("complaints.description")}</label>
                      <textarea placeholder="Detailed description..." rows={3} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t("common.room")}</label>
                        <input type="text" placeholder="e.g., B-402" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t("complaints.priority")}</label>
                        <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                          <option>{t("priority.high")}</option>
                          <option>{t("priority.medium")}</option>
                          <option>{t("priority.low")}</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </Modal.Body>
                <Modal.Footer className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onPress={() => modalState.close()}>{t("common.cancel")}</Button>
                  <Button variant="primary" size="sm" onPress={() => modalState.close()}>{t("complaints.submitComplaint")}</Button>
                </Modal.Footer>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      )}
    </div>
  );
}
