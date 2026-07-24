"use client";

import { Search, Download, IndianRupee, ExternalLink, CheckCircle2, Clock, AlertTriangle, Send, X } from "lucide-react";
import { useState, useEffect } from "react";
import { Card, Chip, Button } from "@heroui/react";
import EmptyState from "@/components/EmptyState";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useUserMode } from "@/lib/UserModeContext";
import { usePropertyContext } from "@/lib/PropertyContext";
import { supabase } from "@/lib/supabase";

interface RentEntry {
  id: string;
  amount: number;
  status: "Paid" | "Pending" | "Overdue";
  due_date: string;
  paid_date: string | null;
  method: string | null;
  tenant_id: string;
  tenants: { name: string; email: string; rooms: { number: string } | null } | null;
}

export default function RentPage() {
  const [filter, setFilter] = useState<"All" | "Paid" | "Pending" | "Overdue">("All");
  const [rentCollection, setRentCollection] = useState<RentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingTo, setSendingTo] = useState<RentEntry | null>(null);
  const [upiId, setUpiId] = useState("");
  const [sendStatus, setSendStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const { t } = useLanguage();
  const { mode } = useUserMode();
  const { propertyId, property } = usePropertyContext();

  useEffect(() => {
    if (!propertyId) return;
    const fetchRent = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("rent_collection")
        .select("*, tenants(name, email, rooms(number))")
        .eq("property_id", propertyId)
        .order("due_date", { ascending: false });
      if (!error && data) {
        setRentCollection(data as RentEntry[]);
      }
      setLoading(false);
    };
    fetchRent();
  }, [propertyId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  // Tenant view — simplified pay rent page
  if (mode === "tenant") {
    const myRent = rentCollection[0];
    const myHistory = rentCollection;

    const statusConfig = {
      Paid: { color: "success" as const, icon: CheckCircle2, bg: "bg-emerald-50", text: "text-emerald-700" },
      Pending: { color: "warning" as const, icon: Clock, bg: "bg-amber-50", text: "text-amber-700" },
      Overdue: { color: "danger" as const, icon: AlertTriangle, bg: "bg-red-50", text: "text-red-700" },
    };

    const config = myRent ? statusConfig[myRent.status] : statusConfig.Pending;
    const StatusIcon = config.icon;

    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t("rent.myRent")}</h2>
          <p className="text-sm text-slate-500 mt-1">{t("rent.myRentSubtitle")}</p>
        </div>

        {/* Current Rent Card */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white">
            <p className="text-sm text-blue-100 font-medium">Amount Due</p>
            <p className="text-4xl font-bold mt-1">{myRent ? `₹${myRent.amount.toLocaleString("en-IN")}` : "₹0"}</p>
            <div className="flex items-center gap-4 mt-4 text-sm text-blue-100">
              <span>Room: {myRent?.tenants?.rooms?.number || "—"}</span>
              <span>Due: {myRent ? new Date(myRent.due_date).toLocaleDateString("en-IN") : "—"}</span>
            </div>
          </div>
          <Card.Content className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${config.bg}`}>
                  <StatusIcon size={16} className={config.text} />
                </div>
                <span className={`text-sm font-semibold ${config.text}`}>
                  {myRent?.status === "Paid" ? t("status.paid") : myRent?.status === "Overdue" ? t("status.overdue") : t("status.pending")}
                </span>
              </div>
              {myRent?.paid_date && (
                <p className="text-xs text-slate-500">
                  Paid on {new Date(myRent.paid_date).toLocaleDateString("en-IN")}
                </p>
              )}
            </div>

            {myRent?.status !== "Paid" && (
              <button
                onClick={() => {
                  alert("Razorpay integration coming soon! This will redirect to the payment gateway.");
                }}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <IndianRupee size={16} />
                Pay Now
                <ExternalLink size={14} className="ml-1 opacity-70" />
              </button>
            )}

            {myRent?.status === "Paid" && (
              <div className="w-full py-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold rounded-xl flex items-center justify-center gap-2 text-sm">
                <CheckCircle2 size={16} />
                Rent Paid for This Month
              </div>
            )}
          </Card.Content>
        </Card>

        {/* Payment History */}
        <Card>
          <Card.Header className="px-5 pt-5 pb-0">
            <Card.Title className="text-sm font-semibold text-slate-800">
              Payment History
            </Card.Title>
          </Card.Header>
          <Card.Content className="p-5">
            <div className="space-y-3">
              {myHistory.map((entry) => {
                const c = statusConfig[entry.status];
                const Icon = c.icon;
                return (
                  <div key={entry.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg ${c.bg}`}>
                        <Icon size={14} className={c.text} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{`₹${entry.amount.toLocaleString("en-IN")}`}</p>
                        <p className="text-xs text-slate-500">
                          Due: {new Date(entry.due_date).toLocaleDateString("en-IN")}
                          {entry.method && ` · ${entry.method}`}
                        </p>
                      </div>
                    </div>
                    <Chip size="sm" variant="soft" color={c.color}>
                      {entry.status}
                    </Chip>
                  </div>
                );
              })}
              {myHistory.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">No rent history</p>
              )}
            </div>
          </Card.Content>
        </Card>

        {/* Razorpay info */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <p className="text-xs text-slate-500 text-center">
            Payments powered by <span className="font-semibold text-blue-600">Razorpay</span> — UPI, Cards, Net Banking supported
          </p>
        </div>
      </div>
    );
  }

  const handleSendPaymentLink = async () => {
    if (!sendingTo || !upiId.trim()) return;
    setSendStatus("sending");

    try {
      const res = await fetch("/api/send-payment-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantName: sendingTo.tenants?.name || "Tenant",
          tenantEmail: sendingTo.tenants?.email || "",
          amount: sendingTo.amount,
          dueDate: sendingTo.due_date,
          upiId: upiId.trim(),
          pgName: property?.name || "PG",
        }),
      });

      if (res.ok) {
        setSendStatus("sent");
        setTimeout(() => { setSendingTo(null); setSendStatus("idle"); }, 2000);
      } else {
        setSendStatus("error");
      }
    } catch {
      setSendStatus("error");
    }
  };

  // Owner view — full rent management table
  const filtered = rentCollection.filter(
    (r) => filter === "All" || r.status === filter
  );

  const totalCollected = rentCollection
    .filter((r) => r.status === "Paid")
    .reduce((sum, r) => sum + r.amount, 0);
  const totalPending = rentCollection
    .filter((r) => r.status !== "Paid")
    .reduce((sum, r) => sum + r.amount, 0);

  const statusColor = {
    Paid: "success" as const,
    Pending: "warning" as const,
    Overdue: "danger" as const,
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t("rent.title")}</h2>
          <p className="text-sm text-slate-500 mt-1">{t("rent.subtitle")}</p>
        </div>
        <Button variant="outline" size="sm">
          <Download size={14} />
          {t("common.exportReport")}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="card-hover">
          <Card.Content className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 rounded-xl">
                <IndianRupee size={18} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{t("rent.collected")}</p>
                <p className="text-xl font-bold text-slate-900">{`₹${totalCollected.toLocaleString("en-IN")}`}</p>
              </div>
            </div>
          </Card.Content>
        </Card>
        <Card className="card-hover">
          <Card.Content className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-50 rounded-xl">
                <IndianRupee size={18} className="text-amber-600" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{t("rent.pending")}</p>
                <p className="text-xl font-bold text-slate-900">{`₹${totalPending.toLocaleString("en-IN")}`}</p>
              </div>
            </div>
          </Card.Content>
        </Card>
        <Card className="card-hover">
          <Card.Content className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 rounded-xl">
                <IndianRupee size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{t("rent.collectionRate")}</p>
                <p className="text-xl font-bold text-slate-900">
                  {rentCollection.length > 0
                    ? Math.round((rentCollection.filter((r) => r.status === "Paid").length / rentCollection.length) * 100)
                    : 0}%
                </p>
              </div>
            </div>
          </Card.Content>
        </Card>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t("rent.searchPlaceholder")}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
          />
        </div>
        <div className="flex gap-1.5 bg-slate-100 p-1 rounded-lg">
          {(["All", "Paid", "Pending", "Overdue"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-all ${
                filter === f ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {f === "All" ? t("common.all") : f === "Paid" ? t("status.paid") : f === "Pending" ? t("status.pending") : t("status.overdue")}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={t("rent.noEntries")} description={t("rent.noEntriesDesc")} />
      ) : (
        <Card>
          <Card.Content className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">{t("common.tenant")}</th>
                    <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">{t("common.room")}</th>
                    <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">{t("nav.rent")}</th>
                    <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">{t("rent.dueDate")}</th>
                    <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">{t("rent.paidDate")}</th>
                    <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">{t("common.method")}</th>
                    <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">{t("common.status")}</th>
                    <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry) => (
                    <tr key={entry.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5 text-sm font-medium text-slate-900">{entry.tenants?.name || "—"}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-600">{entry.tenants?.rooms?.number || "—"}</td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-slate-800">{`₹${entry.amount.toLocaleString("en-IN")}`}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-600">{new Date(entry.due_date).toLocaleDateString("en-IN")}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-600">{entry.paid_date ? new Date(entry.paid_date).toLocaleDateString("en-IN") : "—"}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-600">{entry.method || "—"}</td>
                      <td className="px-5 py-3.5">
                        <Chip size="sm" variant="soft" color={statusColor[entry.status]}>
                          {entry.status === "Paid" ? t("status.paid") : entry.status === "Pending" ? t("status.pending") : t("status.overdue")}
                        </Chip>
                      </td>
                      <td className="px-5 py-3.5">
                        {entry.status !== "Paid" && entry.tenants?.email && (
                          <button
                            onClick={() => { setSendingTo(entry); setSendStatus("idle"); setUpiId(""); }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            <Send size={12} />
                            Send Link
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card.Content>
        </Card>
      )}

      {/* Send Payment Link Modal */}
      {sendingTo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-900">Send Payment Link</h3>
              <button onClick={() => setSendingTo(null)} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                <X size={18} className="text-slate-500" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Tenant</span>
                  <span className="font-medium text-slate-800">{sendingTo.tenants?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Email</span>
                  <span className="font-medium text-slate-800">{sendingTo.tenants?.email}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Amount</span>
                  <span className="font-bold text-slate-900">₹{sendingTo.amount.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Due Date</span>
                  <span className="font-medium text-slate-800">{new Date(sendingTo.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Your UPI ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., yourname@upi or 9876543210@paytm"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">The tenant will receive a UPI payment link to this ID</p>
              </div>

              {sendStatus === "error" && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">Failed to send email. Check your Resend API key.</p>
              )}

              {sendStatus === "sent" && (
                <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  <CheckCircle2 size={14} />
                  Payment link sent successfully!
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setSendingTo(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendPaymentLink}
                disabled={!upiId.trim() || sendStatus === "sending" || sendStatus === "sent"}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {sendStatus === "sending" ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    Send Payment Link
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
