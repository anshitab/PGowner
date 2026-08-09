"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-api";

interface PaymentRow {
  id: string;
  amount: number;
  method: string;
  verified: boolean;
  date: string;
  propertyName: string;
  tenantName: string;
}

interface RentRow {
  id: string;
  amount: number;
  dueDate: string;
  paidDate: string | null;
  status: string;
  method: string | null;
  propertyName: string;
  tenantName: string;
}

export default function AdminPaymentsPage() {
  const [tab, setTab] = useState<"payments" | "rent">("payments");
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [rent, setRent] = useState<RentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const res = await adminFetch<{ payments: PaymentRow[]; rentCollection: RentRow[] }>(
        "/api/admin/payments"
      );
      if (res.error) setError(res.error);
      else {
        setPayments(res.data?.payments || []);
        setRent(res.data?.rentCollection || []);
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payments & rent</h1>
          <p className="text-sm text-slate-500 mt-1">Platform-wide money movement</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTab("payments")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
              tab === "payments" ? "bg-violet-600 text-white" : "bg-white border border-slate-200 text-slate-600"
            }`}
          >
            Payments
          </button>
          <button
            onClick={() => setTab("rent")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
              tab === "rent" ? "bg-violet-600 text-white" : "bg-white border border-slate-200 text-slate-600"
            }`}
          >
            Rent collection
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          {tab === "payments" ? (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Tenant</th>
                  <th className="text-left px-4 py-3 font-semibold">Property</th>
                  <th className="text-left px-4 py-3 font-semibold">Amount</th>
                  <th className="text-left px-4 py-3 font-semibold">Method</th>
                  <th className="text-left px-4 py-3 font-semibold">Verified</th>
                  <th className="text-left px-4 py-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Loading…</td></tr>
                ) : payments.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No payments</td></tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-medium text-slate-900">{p.tenantName}</td>
                      <td className="px-4 py-3 text-slate-600">{p.propertyName}</td>
                      <td className="px-4 py-3 text-slate-800">₹{(p.amount || 0).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3 text-slate-600">{p.method || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${p.verified ? "text-emerald-600" : "text-amber-600"}`}>
                          {p.verified ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {p.date ? new Date(p.date).toLocaleDateString("en-IN") : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Tenant</th>
                  <th className="text-left px-4 py-3 font-semibold">Property</th>
                  <th className="text-left px-4 py-3 font-semibold">Amount</th>
                  <th className="text-left px-4 py-3 font-semibold">Due</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">Loading…</td></tr>
                ) : rent.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">No rent records</td></tr>
                ) : (
                  rent.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-medium text-slate-900">{r.tenantName}</td>
                      <td className="px-4 py-3 text-slate-600">{r.propertyName}</td>
                      <td className="px-4 py-3 text-slate-800">₹{(r.amount || 0).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {r.dueDate ? new Date(r.dueDate).toLocaleDateString("en-IN") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          r.status === "Paid"
                            ? "bg-emerald-50 text-emerald-700"
                            : r.status === "Overdue"
                              ? "bg-rose-50 text-rose-700"
                              : "bg-amber-50 text-amber-700"
                        }`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
