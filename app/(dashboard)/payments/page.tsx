"use client";

import { Search, Download, CheckCircle, Edit3 } from "lucide-react";
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

export default function PaymentsPage() {
  const [methodFilter, setMethodFilter] = useState<"All" | "UPI" | "Cash" | "Bank Transfer">("All");
  const [payments, setPayments] = useState<Payment[]>([]);
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
    const fetchPayments = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("payments")
        .select("*, tenants(name, rooms(number))")
        .eq("property_id", propertyId)
        .order("date", { ascending: false });
      if (!error && data) {
        setPayments(data as Payment[]);
      }
      setLoading(false);
    };
    fetchPayments();
  }, [propertyId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const filtered = payments.filter(
    (p) => methodFilter === "All" || p.method === methodFilter
  );

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
        {mode === "owner" && (
          <Button variant="outline" size="sm">
            <Download size={14} />
            {t("common.export")}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <Card className="card-hover">
          <Card.Content className="p-4">
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">{t("payments.totalTransactions")}</p>
            <p className="text-2xl font-bold text-slate-900">{payments.length}</p>
          </Card.Content>
        </Card>
        <Card className="card-hover">
          <Card.Content className="p-4">
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">{t("payments.verifiedRazorpay")}</p>
            <p className="text-2xl font-bold text-emerald-600">{payments.filter((p) => p.verified).length}</p>
          </Card.Content>
        </Card>
        <Card className="card-hover">
          <Card.Content className="p-4">
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">{t("payments.manualEntries")}</p>
            <p className="text-2xl font-bold text-amber-600">{payments.filter((p) => !p.verified).length}</p>
          </Card.Content>
        </Card>
        <Card className="card-hover">
          <Card.Content className="p-4">
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">{t("payments.upiPayments")}</p>
            <p className="text-2xl font-bold text-blue-600">{payments.filter((p) => p.method === "UPI").length}</p>
          </Card.Content>
        </Card>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t("payments.searchPlaceholder")}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
          />
        </div>
        <div className="flex gap-1.5 bg-slate-100 p-1 rounded-lg">
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
      </div>

      {filtered.length === 0 ? (
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
                  {filtered.map((payment) => (
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
    </div>
  );
}
