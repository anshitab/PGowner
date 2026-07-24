"use client";

import { useState, useEffect } from "react";
import { useUserMode } from "@/lib/UserModeContext";
import { useAuth } from "@/lib/AuthContext";
import { usePropertyContext } from "@/lib/PropertyContext";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Card, Chip } from "@heroui/react";
import { FileText, Download, Shield, Receipt, Calendar } from "lucide-react";

export default function DocumentsPage() {
  const { mode } = useUserMode();
  const { user } = useAuth();
  const { propertyId } = usePropertyContext();
  const router = useRouter();
  const [tenant, setTenant] = useState<Record<string, unknown> | null>(null);
  const [payments, setPayments] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    if (mode === "owner") router.replace("/dashboard");
  }, [mode, router]);

  useEffect(() => {
    if (!user || !propertyId) return;
    (async () => {
      const { data: t } = await supabase
        .from("tenants")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (t) {
        setTenant(t);
        const { data: p } = await supabase
          .from("payments")
          .select("*")
          .eq("tenant_id", t.id)
          .order("date", { ascending: false });
        if (p) setPayments(p);
      }
    })();
  }, [user, propertyId]);

  if (mode === "owner") return null;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-slate-900">My Documents</h2>
        <p className="text-sm text-slate-500 mt-1">View and download your documents</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <Card.Header className="px-5 pt-5 pb-0">
            <Card.Title className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <FileText size={15} className="text-blue-500" />
              Agreements
            </Card.Title>
          </Card.Header>
          <Card.Content className="p-5 space-y-3">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText size={16} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">Rent Agreement</p>
                  <p className="text-[11px] text-slate-500">
                    Valid from {tenant?.join_date ? new Date(tenant.join_date as string).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "-"}
                  </p>
                </div>
              </div>
              <Chip size="sm" variant="soft" color="success">On File</Chip>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <FileText size={16} className="text-slate-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">House Rules</p>
                  <p className="text-[11px] text-slate-500">PG guidelines and policies</p>
                </div>
              </div>
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
                <Download size={12} />
                Download
              </button>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Header className="px-5 pt-5 pb-0">
            <Card.Title className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Shield size={15} className="text-emerald-500" />
              ID Documents
            </Card.Title>
          </Card.Header>
          <Card.Content className="p-5 space-y-3">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Shield size={16} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">Aadhaar Card</p>
                  <p className="text-[11px] text-slate-500 font-mono">{(tenant?.gov_ids as Record<string, string>)?.aadhaar || "XXXX-XXXX-XXXX"}</p>
                </div>
              </div>
              <Chip size="sm" variant="soft" color="success">Verified</Chip>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Shield size={16} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">PAN Card</p>
                  <p className="text-[11px] text-slate-500 font-mono">{(tenant?.gov_ids as Record<string, string>)?.pan || "XXXXX0000X"}</p>
                </div>
              </div>
              <Chip size="sm" variant="soft" color="success">Verified</Chip>
            </div>
          </Card.Content>
        </Card>

        <Card className="lg:col-span-2">
          <Card.Header className="px-5 pt-5 pb-0">
            <Card.Title className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Receipt size={15} className="text-amber-500" />
              Payment Receipts
            </Card.Title>
          </Card.Header>
          <Card.Content className="p-5">
            {payments.length > 0 ? (
              <div className="space-y-2">
                {payments.map((p) => (
                  <div key={p.id as string} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <Receipt size={16} className="text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">₹{(p.amount as number).toLocaleString("en-IN")} — {p.method as string}</p>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Calendar size={10} />
                          {new Date(p.date as string).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
                      <Download size={12} />
                      Receipt
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-6">No payment receipts available</p>
            )}
          </Card.Content>
        </Card>
      </div>
    </div>
  );
}
