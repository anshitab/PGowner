"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useUserMode } from "@/lib/UserModeContext";
import { usePropertyContext } from "@/lib/PropertyContext";
import { supabase } from "@/lib/supabase";
import { Card, Chip } from "@heroui/react";
import {
  ArrowLeft, User, Phone, Mail, MapPin, Briefcase, Building2,
  Shield, IndianRupee, FileText, Download, Calendar, AlertCircle,
  CheckCircle2, Clock,
} from "lucide-react";
import Link from "next/link";
import CheckoutWizard from "@/components/checkout/CheckoutWizard";

interface TenantDetail {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: string;
  rent: number;
  deposit: number;
  join_date: string;
  occupation: string | null;
  company: string | null;
  address: string | null;
  emergency_contact: { name: string; relation: string; phone: string } | null;
  gov_ids: { aadhaar: string; pan: string } | null;
  documents: { agreement: boolean; aadhaar: boolean; pan: boolean } | null;
  rooms: { number: string } | null;
}

interface TenantPayment {
  id: string;
  amount: number;
  date: string;
  method: string;
  verified: boolean;
}

interface RentEntry {
  id: string;
  status: string;
  paid_date: string | null;
}

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { mode } = useUserMode();
  const { propertyId } = usePropertyContext();
  const [showCheckout, setShowCheckout] = useState(false);
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [tenantPayments, setTenantPayments] = useState<TenantPayment[]>([]);
  const [tenantRent, setTenantRent] = useState<RentEntry | null>(null);
  const [loading, setLoading] = useState(true);

  const tenantId = params.id as string;

  useEffect(() => {
    if (mode === "tenant") router.replace("/dashboard");
  }, [mode, router]);

  useEffect(() => {
    if (!tenantId || !propertyId) return;
    const fetchTenantData = async () => {
      setLoading(true);

      // Fetch tenant details
      const { data: tenantData } = await supabase
        .from("tenants")
        .select("*, rooms(number)")
        .eq("id", tenantId)
        .eq("property_id", propertyId)
        .single();

      if (tenantData) {
        setTenant(tenantData as TenantDetail);
      }

      // Fetch tenant payments
      const { data: paymentsData } = await supabase
        .from("payments")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("date", { ascending: false });

      if (paymentsData) {
        setTenantPayments(paymentsData as TenantPayment[]);
      }

      // Fetch latest rent status
      const { data: rentData } = await supabase
        .from("rent_collection")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("due_date", { ascending: false })
        .limit(1)
        .single();

      if (rentData) {
        setTenantRent(rentData as RentEntry);
      }

      setLoading(false);
    };
    fetchTenantData();
  }, [tenantId, propertyId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-slate-500">Tenant not found</p>
        <Link href="/tenants" className="text-sm text-blue-600 mt-2 hover:underline">Back to Tenants</Link>
      </div>
    );
  }

  const pendingAmount = tenantRent?.status !== "Paid" ? `₹${tenant.rent.toLocaleString("en-IN")}` : "₹0";
  const roomNumber = tenant.rooms?.number || "—";

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <ArrowLeft size={18} className="text-slate-500" />
        </button>
        <div className="flex-1 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-lg font-bold text-indigo-700">
              {tenant.name.split(" ").map((n) => n[0]).join("")}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{tenant.name}</h2>
              <p className="text-sm text-slate-500">Room {roomNumber}</p>
            </div>
          </div>
          <Chip size="sm" variant="soft" color={tenant.status === "Active" ? "success" : "default"}>
            {tenant.status}
          </Chip>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setShowCheckout(true)} className="px-4 py-2 text-xs font-medium bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">
          Check Out
        </button>
        <button onClick={() => alert("Reminder sent!")} className="px-4 py-2 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors">
          Send Reminder
        </button>
        <button onClick={() => alert("Agreement download coming soon")} className="px-4 py-2 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
          <Download size={12} className="inline mr-1" />
          Download Agreement
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Personal Info + Contact */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Info */}
          <Card>
            <Card.Header className="px-5 pt-5 pb-0">
              <Card.Title className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <User size={15} className="text-indigo-500" />
                Personal Information
              </Card.Title>
            </Card.Header>
            <Card.Content className="p-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <Phone size={15} className="text-slate-400" />
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-medium">Phone</p>
                    <p className="text-sm font-medium text-slate-800">{tenant.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <Mail size={15} className="text-slate-400" />
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-medium">Email</p>
                    <p className="text-sm font-medium text-slate-800">{tenant.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <Briefcase size={15} className="text-slate-400" />
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-medium">Occupation</p>
                    <p className="text-sm font-medium text-slate-800">{tenant.occupation || "—"}{tenant.company ? ` · ${tenant.company}` : ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <MapPin size={15} className="text-slate-400" />
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-medium">Permanent Address</p>
                    <p className="text-sm font-medium text-slate-800">{tenant.address || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <Calendar size={15} className="text-slate-400" />
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-medium">Check-in Date</p>
                    <p className="text-sm font-medium text-slate-800">
                      {new Date(tenant.join_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>
                {tenant.emergency_contact && (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <AlertCircle size={15} className="text-slate-400" />
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-medium">Emergency Contact</p>
                      <p className="text-sm font-medium text-slate-800">{tenant.emergency_contact.name} ({tenant.emergency_contact.relation})</p>
                      <p className="text-[11px] text-slate-500">{tenant.emergency_contact.phone}</p>
                    </div>
                  </div>
                )}
              </div>
            </Card.Content>
          </Card>

          {/* Government IDs */}
          {tenant.gov_ids && (
            <Card>
              <Card.Header className="px-5 pt-5 pb-0">
                <Card.Title className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <Shield size={15} className="text-emerald-500" />
                  Government IDs
                </Card.Title>
              </Card.Header>
              <Card.Content className="p-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] text-slate-500 uppercase font-medium">Aadhaar</p>
                      <Chip size="sm" variant="soft" color="success">Verified</Chip>
                    </div>
                    <p className="text-sm font-mono font-medium text-slate-800">{tenant.gov_ids.aadhaar}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] text-slate-500 uppercase font-medium">PAN</p>
                      <Chip size="sm" variant="soft" color={tenant.documents?.pan ? "success" : "warning"}>
                        {tenant.documents?.pan ? "Verified" : "Pending"}
                      </Chip>
                    </div>
                    <p className="text-sm font-mono font-medium text-slate-800">{tenant.gov_ids.pan}</p>
                  </div>
                </div>
              </Card.Content>
            </Card>
          )}

          {/* Payment History */}
          <Card>
            <Card.Header className="px-5 pt-5 pb-0">
              <Card.Title className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <IndianRupee size={15} className="text-emerald-500" />
                Payment History
              </Card.Title>
            </Card.Header>
            <Card.Content className="p-5">
              {tenantPayments.length > 0 ? (
                <div className="space-y-2">
                  {tenantPayments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-lg ${p.verified ? "bg-emerald-50" : "bg-slate-100"}`}>
                          {p.verified ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Clock size={14} className="text-slate-400" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{`₹${p.amount.toLocaleString("en-IN")}`}</p>
                          <p className="text-[11px] text-slate-500">
                            {new Date(p.date).toLocaleDateString("en-IN")} · {p.method}
                          </p>
                        </div>
                      </div>
                      <Chip size="sm" variant="soft" color={p.verified ? "success" : "default"}>
                        {p.verified ? "Verified" : "Manual"}
                      </Chip>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">No payment records</p>
              )}
            </Card.Content>
          </Card>
        </div>

        {/* Right Column: Financial Summary + Documents */}
        <div className="space-y-6">
          {/* Financial Summary */}
          <Card>
            <Card.Header className="px-5 pt-5 pb-0">
              <Card.Title className="text-sm font-semibold text-slate-800">Financial Summary</Card.Title>
            </Card.Header>
            <Card.Content className="p-5 space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-xs text-slate-500">Monthly Rent</span>
                <span className="text-sm font-bold text-slate-900">{`₹${tenant.rent.toLocaleString("en-IN")}`}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-xs text-slate-500">Security Deposit</span>
                <span className="text-sm font-bold text-slate-900">{`₹${tenant.deposit.toLocaleString("en-IN")}`}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-xs text-slate-500">Pending Amount</span>
                <span className={`text-sm font-bold ${pendingAmount === "₹0" ? "text-emerald-600" : "text-red-600"}`}>
                  {pendingAmount}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-xs text-slate-500">Rent Status</span>
                <Chip size="sm" variant="soft" color={
                  tenantRent?.status === "Paid" ? "success" :
                  tenantRent?.status === "Overdue" ? "danger" : "warning"
                }>
                  {tenantRent?.status || "N/A"}
                </Chip>
              </div>
            </Card.Content>
          </Card>

          {/* Documents */}
          <Card>
            <Card.Header className="px-5 pt-5 pb-0">
              <Card.Title className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <FileText size={15} className="text-blue-500" />
                Documents
              </Card.Title>
            </Card.Header>
            <Card.Content className="p-5 space-y-2">
              {[
                { name: "Rent Agreement", uploaded: tenant.documents?.agreement ?? false },
                { name: "Aadhaar Card", uploaded: tenant.documents?.aadhaar ?? false },
                { name: "PAN Card", uploaded: tenant.documents?.pan ?? false },
              ].map((doc) => (
                <div key={doc.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText size={14} className={doc.uploaded ? "text-blue-500" : "text-slate-300"} />
                    <span className="text-sm text-slate-700">{doc.name}</span>
                  </div>
                  {doc.uploaded ? (
                    <button onClick={() => alert(`Download ${doc.name} - coming soon`)} className="text-[11px] font-medium text-blue-600 hover:text-blue-700">
                      <Download size={12} className="inline mr-0.5" />
                      View
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400">Not uploaded</span>
                  )}
                </div>
              ))}
            </Card.Content>
          </Card>

          {/* Room Info */}
          <Card>
            <Card.Header className="px-5 pt-5 pb-0">
              <Card.Title className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Building2 size={15} className="text-teal-500" />
                Room Details
              </Card.Title>
            </Card.Header>
            <Card.Content className="p-5 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Room</span>
                <span className="font-medium text-slate-800">{roomNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Since</span>
                <span className="font-medium text-slate-800">
                  {new Date(tenant.join_date).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                </span>
              </div>
            </Card.Content>
          </Card>
        </div>
      </div>

      {showCheckout && (
        <CheckoutWizard
          tenant={{
            id: tenant.id,
            name: tenant.name,
            room: roomNumber,
            joinDate: tenant.join_date,
            rent: `₹${tenant.rent.toLocaleString("en-IN")}`,
            deposit: `₹${tenant.deposit.toLocaleString("en-IN")}`,
          }}
          onClose={() => setShowCheckout(false)}
          onComplete={() => { setShowCheckout(false); router.push("/tenants"); }}
        />
      )}
    </div>
  );
}
