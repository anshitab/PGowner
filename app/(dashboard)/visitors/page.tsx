"use client";

import { useState, useEffect } from "react";
import { Calendar, Phone, User, MessageSquare, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Card, Chip } from "@heroui/react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useUserMode } from "@/lib/UserModeContext";
import { useVisitRequests } from "@/lib/VisitRequestContext";
import { useRouter } from "next/navigation";

export default function VisitorsPage() {
  const { t } = useLanguage();
  const { mode } = useUserMode();
  const { requests, addRequest, updateStatus } = useVisitRequests();
  const router = useRouter();

  useEffect(() => {
    if (mode === "tenant") router.replace("/dashboard");
  }, [mode, router]);

  const [form, setForm] = useState({ name: "", phone: "", date: "", purpose: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.date || !form.purpose) return;
    addRequest(form);
    setForm({ name: "", phone: "", date: "", purpose: "", message: "" });
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  if (mode === "tenant") {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t("visit.scheduleTitle")}</h2>
          <p className="text-sm text-slate-500 mt-1">{t("visitors.title")}</p>
        </div>

        <Card>
          <Card.Content className="p-6">
            {submitted && (
              <div className="mb-4 flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
                <CheckCircle2 size={16} />
                {t("visit.success")}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    {t("visit.name")}
                  </label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    {t("visit.phone")}
                  </label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    {t("visit.date")}
                  </label>
                  <div className="relative">
                    <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    {t("visit.purpose")}
                  </label>
                  <select
                    value={form.purpose}
                    onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    required
                  >
                    <option value="">Select purpose</option>
                    <option value="Room inspection">Room inspection</option>
                    <option value="Family visit">Family visit</option>
                    <option value="Friend visit">Friend visit</option>
                    <option value="Room for someone">Room for someone</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {t("visit.message")}
                </label>
                <div className="relative">
                  <MessageSquare size={16} className="absolute left-3 top-3 text-slate-400" />
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    rows={3}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t("visit.submit")}
              </button>
            </form>
          </Card.Content>
        </Card>
      </div>
    );
  }

  // Owner view — visit requests list
  const pendingRequests = requests.filter((r) => r.status === "pending");
  const pastRequests = requests.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-slate-900">{t("visit.requests")}</h2>
        <p className="text-sm text-slate-500 mt-1">
          {pendingRequests.length} {t("visit.pending")}
        </p>
      </div>

      {/* Pending */}
      {pendingRequests.length > 0 && (
        <div className="space-y-3">
          {pendingRequests.map((req) => (
            <Card key={req.id}>
              <Card.Content className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-900">{req.name}</h3>
                      <Chip size="sm" variant="soft" color="warning">
                        <Clock size={11} className="mr-1" />
                        Pending
                      </Chip>
                    </div>
                    <p className="text-xs text-slate-500">
                      {req.phone} &middot; {new Date(req.date).toLocaleDateString("en-IN")} &middot; {req.purpose}
                    </p>
                    {req.message && (
                      <p className="text-xs text-slate-600 mt-1">&ldquo;{req.message}&rdquo;</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateStatus(req.id, "approved")}
                      className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                    >
                      {t("visit.approve")}
                    </button>
                    <button
                      onClick={() => updateStatus(req.id, "declined")}
                      className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      {t("visit.decline")}
                    </button>
                  </div>
                </div>
              </Card.Content>
            </Card>
          ))}
        </div>
      )}

      {/* Past */}
      {pastRequests.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Past Requests</h3>
          <div className="space-y-2">
            {pastRequests.map((req) => (
              <Card key={req.id}>
                <Card.Content className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{req.name}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(req.date).toLocaleDateString("en-IN")} &middot; {req.purpose}
                      </p>
                    </div>
                    <Chip size="sm" variant="soft" color={req.status === "approved" ? "success" : "danger"}>
                      {req.status === "approved" ? (
                        <span className="flex items-center gap-1"><CheckCircle2 size={11} /> Approved</span>
                      ) : (
                        <span className="flex items-center gap-1"><XCircle size={11} /> Declined</span>
                      )}
                    </Chip>
                  </div>
                </Card.Content>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
