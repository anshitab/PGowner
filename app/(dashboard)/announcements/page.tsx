"use client";

import { useState } from "react";
import { Megaphone, AlertTriangle, AlertCircle, Info, Plus, Trash2 } from "lucide-react";
import { Card, Chip, Button, Modal, useOverlayState } from "@heroui/react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useUserMode } from "@/lib/UserModeContext";
import { useAnnouncements, Announcement } from "@/lib/AnnouncementContext";

const priorityConfig = {
  urgent: { color: "danger" as const, icon: AlertTriangle, label: "Urgent" },
  important: { color: "warning" as const, icon: AlertCircle, label: "Important" },
  normal: { color: "default" as const, icon: Info, label: "Info" },
};

export default function AnnouncementsPage() {
  const { t } = useLanguage();
  const { mode } = useUserMode();
  const { announcements, addAnnouncement, deleteAnnouncement } = useAnnouncements();
  const modalState = useOverlayState();

  const [form, setForm] = useState({ title: "", message: "", priority: "normal" as Announcement["priority"] });

  const handleSubmit = () => {
    if (!form.title || !form.message) return;
    addAnnouncement(form);
    setForm({ title: "", message: "", priority: "normal" });
    modalState.close();
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t("nav.announcements")}</h2>
          <p className="text-sm text-slate-500 mt-1">
            {mode === "owner" ? "Post updates for your tenants" : "Updates from your PG management"}
          </p>
        </div>
        {mode === "owner" && (
          <Button variant="primary" size="sm" onPress={() => modalState.open()}>
            <Plus size={14} />
            New Announcement
          </Button>
        )}
      </div>

      {announcements.length === 0 ? (
        <Card>
          <Card.Content className="p-8 text-center">
            <Megaphone size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">No announcements yet</p>
          </Card.Content>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => {
            const config = priorityConfig[a.priority];
            const PriorityIcon = config.icon;
            return (
              <Card key={a.id}>
                <Card.Content className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-3">
                      <div className={`mt-0.5 p-2 rounded-lg ${
                        a.priority === "urgent" ? "bg-red-50" :
                        a.priority === "important" ? "bg-amber-50" : "bg-blue-50"
                      }`}>
                        <PriorityIcon size={16} className={
                          a.priority === "urgent" ? "text-red-500" :
                          a.priority === "important" ? "text-amber-500" : "text-blue-500"
                        } />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-slate-900">{a.title}</h3>
                          <Chip size="sm" variant="soft" color={config.color}>
                            {config.label}
                          </Chip>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">{a.message}</p>
                        <p className="text-xs text-slate-400">
                          {new Date(a.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                    {mode === "owner" && (
                      <button
                        onClick={() => deleteAnnouncement(a.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </Card.Content>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Announcement Modal (Owner only) */}
      {modalState.isOpen && (
        <Modal state={modalState}>
          <Modal.Backdrop isDismissable variant="blur" onClick={() => modalState.close()}>
            <Modal.Container size="md" placement="center">
              <Modal.Dialog aria-label="New Announcement">
                <Modal.Header>
                  <Modal.Heading>New Announcement</Modal.Heading>
                </Modal.Header>
                <Modal.Body>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                      <input
                        type="text"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        placeholder="e.g., Water supply maintenance"
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                      <textarea
                        value={form.message}
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                        rows={4}
                        placeholder="Write your announcement here..."
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                      <div className="flex gap-2">
                        {(["normal", "important", "urgent"] as const).map((p) => (
                          <button
                            key={p}
                            onClick={() => setForm({ ...form, priority: p })}
                            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                              form.priority === p
                                ? p === "urgent"
                                  ? "bg-red-50 border-red-200 text-red-700"
                                  : p === "important"
                                  ? "bg-amber-50 border-amber-200 text-amber-700"
                                  : "bg-blue-50 border-blue-200 text-blue-700"
                                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            {p.charAt(0).toUpperCase() + p.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </Modal.Body>
                <Modal.Footer className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onPress={() => modalState.close()}>
                    {t("common.cancel")}
                  </Button>
                  <Button variant="primary" size="sm" onPress={handleSubmit}>
                    Post Announcement
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
