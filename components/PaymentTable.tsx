"use client";

import { useState, useEffect } from "react";
import { CheckCircle, Edit3 } from "lucide-react";
import { Card, Chip } from "@heroui/react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { usePropertyContext } from "@/lib/PropertyContext";
import { supabase } from "@/lib/supabase";

interface Payment {
  id: string;
  tenant: string;
  room: string;
  amount: number;
  method: string;
  date: string;
  verified: boolean;
}

export default function PaymentTable() {
  const { t } = useLanguage();
  const { propertyId } = usePropertyContext();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPayments() {
      if (!propertyId) {
        setPayments([]);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("payments")
        .select("id, amount, method, date, verified, tenants(name, rooms(number))")
        .eq("property_id", propertyId)
        .order("date", { ascending: false })
        .limit(10);

      if (data) {
        setPayments(
          data.map((p: Record<string, unknown>) => ({
            id: p.id as string,
            tenant: ((p.tenants as { name: string } | null)?.name) || "",
            room: (((p.tenants as { rooms: { number: string } | null } | null)?.rooms as { number: string } | null)?.number) || "",
            amount: (p.amount as number) || 0,
            method: (p.method as string) || "Cash",
            date: (p.date as string) || "",
            verified: (p.verified as boolean) || false,
          }))
        );
      }
      setLoading(false);
    }

    fetchPayments();
  }, [propertyId]);

  if (loading) {
    return (
      <Card>
        <Card.Header className="px-5 pt-5 pb-0">
          <Card.Title className="text-sm font-semibold text-slate-800">
            {t("chart.recentPayments")}
          </Card.Title>
        </Card.Header>
        <Card.Content className="px-5 pb-5 pt-4">
          <p className="text-sm text-slate-400 text-center py-4">Loading...</p>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card>
      <Card.Header className="px-5 pt-5 pb-0">
        <Card.Title className="text-sm font-semibold text-slate-800">
          {t("chart.recentPayments")}
        </Card.Title>
      </Card.Header>
      <Card.Content className="px-5 pb-5 pt-4">
        {payments.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">No payments recorded</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider pb-3">
                    {t("common.tenant")}
                  </th>
                  <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider pb-3">
                    {t("common.room")}
                  </th>
                  <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider pb-3">
                    {t("common.amount")}
                  </th>
                  <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider pb-3">
                    {t("common.method")}
                  </th>
                  <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider pb-3">
                    {t("payments.verification")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="py-3 text-sm font-medium text-slate-800">
                      {payment.tenant}
                    </td>
                    <td className="py-3 text-sm text-slate-600">{payment.room}</td>
                    <td className="py-3 text-sm font-semibold text-slate-800">
                      {`₹${payment.amount.toLocaleString("en-IN")}`}
                    </td>
                    <td className="py-3">
                      <Chip
                        size="sm"
                        variant="soft"
                        color={payment.method === "UPI" ? "accent" : "default"}
                      >
                        {payment.method}
                      </Chip>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1.5">
                        {payment.verified ? (
                          <CheckCircle size={14} className="text-emerald-500" />
                        ) : (
                          <Edit3 size={14} className="text-slate-400" />
                        )}
                        <span
                          className={`text-xs font-medium ${
                            payment.verified ? "text-emerald-600" : "text-slate-500"
                          }`}
                        >
                          {payment.verified ? t("verification.razorpay") : t("verification.manual")}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
