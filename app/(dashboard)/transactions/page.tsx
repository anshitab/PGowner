"use client";

import { Card, Chip } from "@heroui/react";
import { useUserMode } from "@/lib/UserModeContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle2, Clock, XCircle, Search, IndianRupee, ArrowUpRight } from "lucide-react";
import { usePropertyContext } from "@/lib/PropertyContext";
import { supabase } from "@/lib/supabase";

interface Transaction {
  id: string;
  razorpay_id: string;
  amount: number;
  gateway_fee: number;
  net_amount: number;
  status: "Successful" | "Pending" | "Failed";
  date: string;
  tenants: { name: string } | null;
}

const statusConfig = {
  Successful: { color: "success" as const, icon: CheckCircle2, bg: "bg-emerald-50", text: "text-emerald-600" },
  Pending: { color: "warning" as const, icon: Clock, bg: "bg-amber-50", text: "text-amber-600" },
  Failed: { color: "danger" as const, icon: XCircle, bg: "bg-red-50", text: "text-red-600" },
};

export default function TransactionsPage() {
  const { mode } = useUserMode();
  const router = useRouter();
  const { propertyId } = usePropertyContext();
  const [filter, setFilter] = useState<"All" | "Successful" | "Pending" | "Failed">("All");
  const [search, setSearch] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (mode === "tenant") router.replace("/dashboard");
  }, [mode, router]);

  useEffect(() => {
    if (!propertyId) return;
    const fetchTransactions = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("transactions")
        .select("*, tenants(name)")
        .eq("property_id", propertyId)
        .order("date", { ascending: false });
      if (!error && data) {
        setTransactions(data as Transaction[]);
      }
      setLoading(false);
    };
    fetchTransactions();
  }, [propertyId]);

  if (mode === "tenant") return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const filtered = transactions.filter((t) => {
    const matchesStatus = filter === "All" || t.status === filter;
    const matchesSearch =
      (t.tenants?.name || "").toLowerCase().includes(search.toLowerCase()) ||
      t.razorpay_id.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const successful = transactions.filter((t) => t.status === "Successful");
  const totalAmount = successful.reduce((sum, t) => sum + t.amount, 0);
  const totalFees = successful.reduce((sum, t) => sum + t.gateway_fee, 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Razorpay Transactions</h2>
          <p className="text-sm text-slate-500 mt-1">
            {transactions.length} transactions · {successful.length} successful
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <Card.Content className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-500 uppercase font-medium">Total Collected</p>
                <p className="text-xl font-bold text-slate-900 mt-1">{`₹${totalAmount.toLocaleString("en-IN")}`}</p>
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
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-all ${
                filter === f ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
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
                {filtered.map((txn) => {
                  const config = statusConfig[txn.status];
                  return (
                    <tr key={txn.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <code className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">
                          {txn.razorpay_id}
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
                {filtered.length === 0 && (
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
    </div>
  );
}
