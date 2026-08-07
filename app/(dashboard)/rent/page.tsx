"use client";

import { Search, Download, IndianRupee, CheckCircle2, Clock, AlertTriangle, Send, X, Plus, Upload, Camera, ShieldCheck, XCircle } from "lucide-react";
import { useState, useEffect, useRef } from "react";
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
  tenants: { name: string; email: string; rooms: { number: string; floor: number } | null } | null;
}

export default function RentPage() {
  const [filter, setFilter] = useState<"All" | "Paid" | "Pending" | "Overdue">("All");
  const [floorFilter, setFloorFilter] = useState<"All" | number>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [rentCollection, setRentCollection] = useState<RentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingTo, setSendingTo] = useState<RentEntry | null>(null);
  const [upiId, setUpiId] = useState("");
  const [sendStatus, setSendStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [recordingFor, setRecordingFor] = useState<RentEntry | null>(null);
  const [recordMethod, setRecordMethod] = useState<"Cash" | "UPI" | "Bank Transfer">("Cash");
  const [recordSubmitting, setRecordSubmitting] = useState(false);
  const [payingEntry, setPayingEntry] = useState<RentEntry | null>(null);
  const [payScreenshot, setPayScreenshot] = useState<{ file: File; preview: string } | null>(null);
  const [payStatus, setPayStatus] = useState<"idle" | "verifying" | "verified" | "rejected">("idle");
  const [payError, setPayError] = useState("");
  const payFileRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();
  const { mode } = useUserMode();
  const { propertyId, property } = usePropertyContext();

  const fetchRent = async () => {
    if (!propertyId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("rent_collection")
      .select("*, tenants(name, email, rooms(number, floor))")
      .eq("property_id", propertyId)
      .order("due_date", { ascending: false });
    if (!error && data) {
      setRentCollection(data as RentEntry[]);
    }
    setLoading(false);
  };

  useEffect(() => {
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
      <div className="space-y-4 sm:space-y-8">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">{t("rent.myRent")}</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1">{t("rent.myRentSubtitle")}</p>
        </div>

        {/* Current Rent Card */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-4 sm:p-6 text-white">
            <p className="text-xs sm:text-sm text-emerald-100 font-medium">Amount Due</p>
            <p className="text-2xl sm:text-4xl font-bold mt-0.5 sm:mt-1">{myRent ? `₹${myRent.amount.toLocaleString("en-IN")}` : "₹0"}</p>
            <div className="flex items-center gap-3 sm:gap-4 mt-2 sm:mt-4 text-[11px] sm:text-sm text-emerald-100">
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
                onClick={() => { setPayingEntry(myRent!); setPayStatus("idle"); setPayScreenshot(null); setPayError(""); }}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <Upload size={16} />
                I've Paid — Upload Proof
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

        {/* UPI info */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <p className="text-xs text-slate-500 text-center">
            Pay via UPI and upload a screenshot — AI verifies and notifies your owner instantly
          </p>
        </div>

        {/* Payment Screenshot Upload Modal */}
        {payingEntry && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <h3 className="text-base font-semibold text-slate-900">Upload Payment Proof</h3>
                <button onClick={() => { setPayingEntry(null); setPayScreenshot(null); setPayStatus("idle"); }} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                  <X size={18} className="text-slate-500" />
                </button>
              </div>

              <div className="px-6 py-5 space-y-4">
                {payStatus === "verified" ? (
                  <div className="text-center py-6">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ShieldCheck size={28} className="text-emerald-600" />
                    </div>
                    <h4 className="text-lg font-semibold text-emerald-800 mb-1">Payment Verified!</h4>
                    <p className="text-sm text-slate-500">Your rent has been marked as paid and your owner has been notified.</p>
                    <button
                      onClick={() => { setPayingEntry(null); setPayScreenshot(null); setPayStatus("idle"); fetchRent(); }}
                      className="mt-6 px-6 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Amount</span>
                        <span className="font-bold text-slate-900">₹{payingEntry.amount.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Due Date</span>
                        <span className="font-medium text-slate-800">{new Date(payingEntry.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Payment Screenshot</label>
                      <input
                        ref={payFileRef}
                        type="file"
                        accept="image/jpeg,image/png,image/jpg"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file && file.size <= 10 * 1024 * 1024) {
                            setPayScreenshot({ file, preview: URL.createObjectURL(file) });
                            setPayError("");
                          } else if (file) {
                            setPayError("File too large. Max 10MB.");
                          }
                        }}
                        className="hidden"
                      />
                      {payScreenshot ? (
                        <div className="relative">
                          <img src={payScreenshot.preview} alt="Payment screenshot" className="w-full h-48 object-contain bg-slate-100 rounded-lg border border-slate-200" />
                          <button
                            onClick={() => { URL.revokeObjectURL(payScreenshot.preview); setPayScreenshot(null); if (payFileRef.current) payFileRef.current.value = ""; }}
                            className="absolute top-2 right-2 w-7 h-7 bg-white/90 border border-slate-200 rounded-full flex items-center justify-center hover:bg-red-50 transition-colors"
                          >
                            <X size={14} className="text-slate-600" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => payFileRef.current?.click()}
                          className="w-full border-2 border-dashed border-slate-300 rounded-xl py-8 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-colors"
                        >
                          <Camera size={24} className="mx-auto text-slate-400 mb-2" />
                          <p className="text-sm font-medium text-slate-600">Upload UPI Payment Screenshot</p>
                          <p className="text-xs text-slate-400 mt-1">JPG or PNG, max 10MB</p>
                        </button>
                      )}
                    </div>

                    {payStatus === "rejected" && (
                      <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
                        <XCircle size={16} className="shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium">Verification Failed</p>
                          <p className="text-xs mt-0.5">{payError || "Could not verify. Please upload a clear screenshot of a successful UPI payment."}</p>
                        </div>
                      </div>
                    )}

                    {payError && payStatus !== "rejected" && (
                      <p className="text-sm text-red-600">{payError}</p>
                    )}
                  </>
                )}
              </div>

              {payStatus !== "verified" && (
                <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
                  <button
                    onClick={() => { setPayingEntry(null); setPayScreenshot(null); setPayStatus("idle"); }}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!payScreenshot || !payingEntry) return;
                      setPayStatus("verifying");
                      setPayError("");
                      try {
                        const reader = new FileReader();
                        const base64 = await new Promise<string>((resolve, reject) => {
                          reader.onload = () => {
                            const result = reader.result as string;
                            resolve(result.split(",")[1]);
                          };
                          reader.onerror = reject;
                          reader.readAsDataURL(payScreenshot.file);
                        });

                        const res = await fetch("/api/verify-payment", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            tenantId: payingEntry.tenant_id,
                            propertyId,
                            rentCollectionId: payingEntry.id,
                            imageBase64: base64,
                            amount: payingEntry.amount,
                          }),
                        });

                        const data = await res.json();
                        if (data.status === "verified") {
                          setPayStatus("verified");
                        } else {
                          setPayStatus("rejected");
                          setPayError(data.reason || data.error || "Verification failed");
                        }
                      } catch {
                        setPayStatus("rejected");
                        setPayError("Something went wrong. Please try again.");
                      }
                    }}
                    disabled={!payScreenshot || payStatus === "verifying"}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {payStatus === "verifying" ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={14} />
                        Submit for Verification
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
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

  const handleRecordPayment = async () => {
    if (!recordingFor || !propertyId) return;
    setRecordSubmitting(true);

    const today = new Date().toISOString().split("T")[0];

    await supabase
      .from("rent_collection")
      .update({ status: "Paid", paid_date: today, method: recordMethod })
      .eq("id", recordingFor.id);

    await supabase.from("payments").insert({
      property_id: propertyId,
      tenant_id: recordingFor.tenant_id,
      amount: recordingFor.amount,
      method: recordMethod,
      verified: false,
      date: today,
    });

    setRecordSubmitting(false);
    setRecordingFor(null);
    await fetchRent();
  };

  // Owner view — full rent management table
  const totalFloors = property?.total_floors || 0;
  const floors = Array.from({ length: totalFloors }, (_, i) => i);

  const filtered = rentCollection
    .filter((r) => filter === "All" || r.status === filter)
    .filter((r) => floorFilter === "All" || r.tenants?.rooms?.floor === floorFilter)
    .filter((r) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (r.tenants?.name || "").toLowerCase().includes(q) ||
        (r.tenants?.rooms?.number || "").toLowerCase().includes(q)
      );
    });

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
    <div className="space-y-4 sm:space-y-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">{t("rent.title")}</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1">{t("rent.subtitle")}</p>
        </div>
        <Button variant="outline" size="sm">
          <Download size={14} />
          <span className="hidden sm:inline">{t("common.exportReport")}</span>
          <span className="sm:hidden">Export</span>
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-5">
        <Card className="card-hover">
          <Card.Content className="p-3 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-2.5 bg-emerald-50 rounded-xl w-fit">
                <IndianRupee size={14} className="sm:hidden text-emerald-600" />
                <IndianRupee size={18} className="hidden sm:block text-emerald-600" />
              </div>
              <div>
                <p className="text-[9px] sm:text-[11px] font-medium text-slate-500 uppercase tracking-wider">{t("rent.collected")}</p>
                <p className="text-sm sm:text-xl font-bold text-slate-900">{`₹${totalCollected.toLocaleString("en-IN")}`}</p>
              </div>
            </div>
          </Card.Content>
        </Card>
        <Card className="card-hover">
          <Card.Content className="p-3 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-2.5 bg-amber-50 rounded-xl w-fit">
                <IndianRupee size={14} className="sm:hidden text-amber-600" />
                <IndianRupee size={18} className="hidden sm:block text-amber-600" />
              </div>
              <div>
                <p className="text-[9px] sm:text-[11px] font-medium text-slate-500 uppercase tracking-wider">{t("rent.pending")}</p>
                <p className="text-sm sm:text-xl font-bold text-slate-900">{`₹${totalPending.toLocaleString("en-IN")}`}</p>
              </div>
            </div>
          </Card.Content>
        </Card>
        <Card className="card-hover">
          <Card.Content className="p-3 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-2.5 bg-blue-50 rounded-xl w-fit">
                <IndianRupee size={14} className="sm:hidden text-blue-600" />
                <IndianRupee size={18} className="hidden sm:block text-blue-600" />
              </div>
              <div>
                <p className="text-[9px] sm:text-[11px] font-medium text-slate-500 uppercase tracking-wider">{t("rent.collectionRate")}</p>
                <p className="text-sm sm:text-xl font-bold text-slate-900">
                  {rentCollection.length > 0
                    ? Math.round((rentCollection.filter((r) => r.status === "Paid").length / rentCollection.length) * 100)
                    : 0}%
                </p>
              </div>
            </div>
          </Card.Content>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("rent.searchPlaceholder")}
            className="w-full pl-9 pr-4 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
          />
        </div>
        <div className="flex gap-1 sm:gap-1.5 bg-slate-100 p-1 rounded-lg overflow-x-auto">
          {(["All", "Paid", "Pending", "Overdue"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 sm:px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                filter === f ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {f === "All" ? t("common.all") : f === "Paid" ? t("status.paid") : f === "Pending" ? t("status.pending") : t("status.overdue")}
            </button>
          ))}
        </div>
      </div>

      {floors.length > 0 && (
        <div className="flex items-center gap-2">
          <select
            value={floorFilter === "All" ? "All" : String(floorFilter)}
            onChange={(e) => setFloorFilter(e.target.value === "All" ? "All" : Number(e.target.value))}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          >
            <option value="All">All Floors</option>
            {floors.map((f) => (
              <option key={f} value={f}>
                {f === 0 ? "Ground Floor" : `Floor ${f}`}
              </option>
            ))}
          </select>
        </div>
      )}

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
                        {entry.status !== "Paid" && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => { setRecordingFor(entry); setRecordMethod("Cash"); }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                            >
                              <Plus size={12} />
                              Record
                            </button>
                            {entry.tenants?.email && (
                              <button
                                onClick={() => { setSendingTo(entry); setSendStatus("idle"); setUpiId(""); }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                              >
                                <Send size={12} />
                                Send Link
                              </button>
                            )}
                          </div>
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

      {/* Record Payment Modal */}
      {recordingFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-900">Record Payment</h3>
              <button onClick={() => setRecordingFor(null)} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                <X size={18} className="text-slate-500" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Tenant</span>
                  <span className="font-medium text-slate-800">{recordingFor.tenants?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Room</span>
                  <span className="font-medium text-slate-800">{recordingFor.tenants?.rooms?.number || "—"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Amount</span>
                  <span className="font-bold text-slate-900">₹{recordingFor.amount.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Due Date</span>
                  <span className="font-medium text-slate-800">{new Date(recordingFor.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Payment Method</label>
                <div className="flex gap-2">
                  {(["Cash", "UPI", "Bank Transfer"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setRecordMethod(m)}
                      className={`flex-1 px-3 py-2.5 text-sm font-medium rounded-lg border transition-all ${
                        recordMethod === m
                          ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setRecordingFor(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                disabled={recordSubmitting}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {recordSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    Mark as Paid
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
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
