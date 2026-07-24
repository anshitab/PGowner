"use client";

import { Search, Download, CheckCircle, Edit3, CheckCircle2, Clock, XCircle, IndianRupee, ArrowUpRight } from "lucide-react";
import { useState, useEffect } from "react";
import { Card, Chip, Button } from "@heroui/react";
import EmptyState from "@/components/EmptyState";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useUserMode } from "@/lib/UserModeContext";
import { useRouter } from "next/navigation";
import { usePropertyContext } from "@/lib/PropertyContext";
import { supabase } from "@/lib/supabase";

interface Payment {
  id: string;
  amount: number;
  date: string;
  method: string;
  verified: boolean;
  tenants: { name: string; rooms: { number: string } | null } | null;
}

interface Transaction {
  id: string;
  gateway_id: string;
  amount: number;
  gateway_fee: number;
  net_amount: number;
  status: "Successful" | "Pending" | "Failed";
  date: string;
  tenants: { name: string } | null;
}

const statusConfig = {
  Successful: { color: "success" as const, icon: CheckCircle2 },
  Pending: { color: "warning" as const, icon: Clock },
  Failed: { color: "danger" as const, icon: XCircle },
};

export default function PaymentsPage() {
  const [tab, setTab] = useState<"payments" | "transactions">("payments");
  const [methodFilter, setMethodFilter] = useState<"All" | "UPI" | "Cash" | "Bank Transfer">("All");
  const [txnFilter, setTxnFilter] = useState<"All" | "Successful" | "Pending" | "Failed">("All");
  const [search, setSearch] = useState("");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();
  const { mode } = useUserMode();
  const router = useRouter();
  const { propertyId } = usePropertyContext();

  useEffect(() => {
    if (mode === "tenant") router.replace("/dashboard");
  }, [mode, router]);

  useEffect(() => {
    if (!propertyId) return;
    const fetchData = async () => {
      setLoading(true);
      const [paymentsRes, txnRes] = await Promise.all([
        supabase
          .from("payments")
          .select("*, tenants(name, rooms(number))")
          .eq("property_id", propertyId)
          .order("date", { ascending: false }),
        supabase
          .from("transactions")
          .select("*, tenants(name)")
          .eq("property_id", propertyId)
          .order("date", { ascending: false }),
      ]);
      if (paymentsRes.data) setPayments(paymentsRes.data as Payment[]);
      if (txnRes.data) setTransactions(txnRes.data as Transaction[]);
      setLoading(false);
    };
    fetchData();
  }, [propertyId]);

  if (mode === "tenant") return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const filteredPayments = payments.filter(
    (p) => methodFilter === "All" || p.method === methodFilter
  );

  const filteredTxns = transactions.filter((txn) => {
    const matchesStatus = txnFilter === "All" || txn.status === txnFilter;
    const matchesSearch =
      (txn.tenants?.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (txn.gateway_id || "").toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const successful = transactions.filter((t) => t.status === "Successful");
  const totalCollected = successful.reduce((sum, t) => sum + t.amount, 0);
  const totalFees = successful.reduce((sum, t) => sum + t.gateway_fee, 0);

  const methodColor: Record<string, "accent" | "default" | "success"> = {
    UPI: "accent",
    Cash: "default",
    "Bank Transfer": "success",
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t("payments.title")}</h2>
          <p className="text-sm text-slate-500 mt-1">{t("payments.subtitle")}</p>
        </div>
        <Button variant="outline" size="sm">
          <Download size={14} />
          {t("common.export")}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setTab("payments")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            tab === "payments" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Payments ({payments.length})
        </button>
        <button
          onClick={() => setTab("transactions")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            tab === "transactions" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Transactions ({transactions.length})
        </button>
      </div>

      {tab === "payments" ? (
        <>
          {/* Payment KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <Card.Content className="p-4">
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">{t("payments.totalTransactions")}</p>
                <p className="text-2xl font-bold text-slate-900">{payments.length}</p>
              </Card.Content>
            </Card>
            <Card>
              <Card.Content className="p-4">
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">{t("payments.verifiedRazorpay")}</p>
                <p className="text-2xl font-bold text-emerald-600">{payments.filter((p) => p.verified).length}</p>
              </Card.Content>
            </Card>
            <Card>
              <Card.Content className="p-4">
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">{t("payments.manualEntries")}</p>
                <p className="text-2xl font-bold text-amber-600">{payments.filter((p) => !p.verified).length}</p>
              </Card.Content>
            </Card>
            <Card>
              <Card.Content className="p-4">
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">{t("payments.upiPayments")}</p>
                <p className="text-2xl font-bold text-blue-600">{payments.filter((p) => p.method === "UPI").length}</p>
              </Card.Content>
            </Card>
          </div>

          {/* Method Filter */}
          <div className="flex gap-1.5 bg-slate-100 p-1 rounded-lg w-fit">
            {(["All", "UPI", "Cash", "Bank Transfer"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setMethodFilter(f)}
                className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-all ${
                  methodFilter === f ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {f === "All" ? t("common.all") : f === "Bank Transfer" ? t("payments.bankTransfer") : f}
              </button>
            ))}
          </div>

          {/* Payments Table */}
          {filteredPayments.length === 0 ? (
            <EmptyState title={t("payments.noPayments")} description={t("payments.noPaymentsDesc")} />
          ) : (
            <Card>
              <Card.Content className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/50">
                        <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">{t("common.tenant")}</th>
                        <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">{t("common.room")}</th>
                        <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">{t("common.amount")}</th>
                        <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">{t("common.date")}</th>
                        <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">{t("common.method")}</th>
                        <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">{t("payments.verification")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPayments.map((payment) => (
                        <tr key={payment.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-3.5 text-sm font-medium text-slate-900">{payment.tenants?.name || "—"}</td>
                          <td className="px-5 py-3.5 text-sm text-slate-600">{payment.tenants?.rooms?.number || "—"}</td>
                          <td className="px-5 py-3.5 text-sm font-semibold text-slate-800">{`₹${payment.amount.toLocaleString("en-IN")}`}</td>
                          <td className="px-5 py-3.5 text-sm text-slate-600">{new Date(payment.date).toLocaleDateString("en-IN")}</td>
                          <td className="px-5 py-3.5">
                            <Chip size="sm" variant="soft" color={methodColor[payment.method]}>{payment.method}</Chip>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-1.5">
                              {payment.verified ? <CheckCircle size={14} className="text-emerald-500" /> : <Edit3 size={14} className="text-slate-400" />}
                              <span className={`text-xs font-medium ${payment.verified ? "text-emerald-600" : "text-slate-500"}`}>
                                {payment.verified ? t("verification.razorpay") : t("verification.manual")}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card.Content>
            </Card>
          )}
        </>
      ) : (
        <>
          {/* Transaction KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <Card.Content className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-slate-500 uppercase font-medium">Total Collected</p>
                    <p className="text-xl font-bold text-slate-900 mt-1">{`₹${totalCollected.toLocaleString("en-IN")}`}</p>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl">
                    <IndianRupee size={18} className="text-emerald-600" />
                  </div>
                </div>
              </Card.Content>
            </Card>
            <Card>
              <Card.Content className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-slate-500 uppercase font-medium">Gateway Fees</p>
                    <p className="text-xl font-bold text-slate-900 mt-1">{`₹${totalFees.toLocaleString("en-IN")}`}</p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-xl">
                    <ArrowUpRight size={18} className="text-amber-600" />
                  </div>
                </div>
              </Card.Content>
            </Card>
            <Card>
              <Card.Content className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-slate-500 uppercase font-medium">Successful</p>
                    <p className="text-xl font-bold text-emerald-600 mt-1">{successful.length}</p>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl">
                    <CheckCircle2 size={18} className="text-emerald-600" />
                  </div>
                </div>
              </Card.Content>
            </Card>
            <Card>
              <Card.Content className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-slate-500 uppercase font-medium">Failed / Pending</p>
                    <p className="text-xl font-bold text-red-600 mt-1">
                      {transactions.filter((t) => t.status !== "Successful").length}
                    </p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-xl">
                    <XCircle size={18} className="text-red-600" />
                  </div>
                </div>
              </Card.Content>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by tenant or transaction ID..."
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
              />
            </div>
            <div className="flex gap-1.5 bg-slate-100 p-1 rounded-lg">
              {(["All", "Successful", "Pending", "Failed"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setTxnFilter(f)}
                  className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-all ${
                    txnFilter === f ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Transactions Table */}
          <Card>
            <Card.Content className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50">
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase">Transaction ID</th>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase">Tenant</th>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase">Amount</th>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase">Fee</th>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase">Net</th>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase">Date</th>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTxns.map((txn) => {
                      const config = statusConfig[txn.status];
                      return (
                        <tr key={txn.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-4">
                            <code className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">
                              {txn.gateway_id || "—"}
                            </code>
                          </td>
                          <td className="px-5 py-4 text-sm font-medium text-slate-800">{txn.tenants?.name || "—"}</td>
                          <td className="px-5 py-4 text-sm font-semibold text-slate-900">{`₹${txn.amount.toLocaleString("en-IN")}`}</td>
                          <td className="px-5 py-4 text-sm text-slate-500">{`₹${txn.gateway_fee.toLocaleString("en-IN")}`}</td>
                          <td className="px-5 py-4 text-sm font-medium text-slate-800">{`₹${txn.net_amount.toLocaleString("en-IN")}`}</td>
                          <td className="px-5 py-4 text-sm text-slate-500">
                            {new Date(txn.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          </td>
                          <td className="px-5 py-4">
                            <Chip size="sm" variant="soft" color={config.color}>
                              {txn.status}
                            </Chip>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredTxns.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-400">
                          No transactions found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card.Content>
          </Card>
        </>
      )}
    </div>
  );
}
