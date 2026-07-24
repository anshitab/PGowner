"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useUserMode } from "@/lib/UserModeContext";
import { useVisitRequests } from "@/lib/VisitRequestContext";
import { useAnnouncements } from "@/lib/AnnouncementContext";
import { useAuth } from "@/lib/AuthContext";
import { usePGData } from "@/lib/usePGData";
import { useComplaints } from "@/lib/ComplaintContext";
import { useExpenses } from "@/lib/ExpenseContext";
import { usePropertyContext } from "@/lib/PropertyContext";
import { supabase } from "@/lib/supabase";
import { Card, Chip } from "@heroui/react";
import {
  Clock, CalendarDays, Megaphone, IndianRupee, AlertTriangle, AlertCircle,
  Info, Building2, DoorOpen, UserPlus, Users, User, Phone, Mail, Home,
  BedDouble, TrendingUp, Receipt, ShieldAlert, FileText, ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function Dashboard() {
  const { t } = useLanguage();
  const { mode } = useUserMode();
  const { user } = useAuth();
  const { requests, updateStatus } = useVisitRequests();
  const { announcements } = useAnnouncements();
  const pgData = usePGData();
  const rooms = pgData.rooms;
  const { complaints } = useComplaints();
  const { expenses } = useExpenses();
  const { property } = usePropertyContext();
  const pendingVisits = requests.filter((r) => r.status === "pending");
  const [fabOpen, setFabOpen] = useState(false);
  const [recentPayments, setRecentPayments] = useState<Array<{ id: string; tenant: string; room: string; amount: number }>>([]);
  const [tenantData, setTenantData] = useState<{ name?: string; phone?: string; email?: string; room?: string; rent?: number; joinDate?: string; property?: string } | null>(null);
  const [myPayments, setMyPayments] = useState<Array<{ id: string; amount: number; date: string; method: string; verified: boolean }>>([]);

  // Fetch recent payments for owner dashboard
  useEffect(() => {
    async function fetchRecentPayments() {
      if (mode === "tenant") return;
      if (!property) return;

      const { data } = await supabase
        .from("payments")
        .select("id, amount, created_at, tenants(name, rooms(number))")
        .eq("property_id", property.id)
        .order("created_at", { ascending: false })
        .limit(3);

      if (data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setRecentPayments(data.map((p: any) => ({
          id: p.id,
          tenant: p.tenants?.name || "Unknown",
          room: p.tenants?.rooms?.number || "",
          amount: p.amount || 0,
        })));
      }
    }
    fetchRecentPayments();
  }, [mode, property]);

  // Fetch tenant-specific data for tenant dashboard
  useEffect(() => {
    async function fetchTenantData() {
      if (mode !== "tenant" || !user?.id) return;

      // Try by user_id first, then fallback to email match
      let { data: tenant } = await supabase
        .from("tenants")
        .select("*, rooms(number, rent), properties(name)")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!tenant && user.email) {
        const { data: emailMatch } = await supabase
          .from("tenants")
          .select("*, rooms(number, rent), properties(name)")
          .eq("email", user.email)
          .is("user_id", null)
          .maybeSingle();

        if (emailMatch) {
          // Link the tenant record to this user
          await supabase
            .from("tenants")
            .update({ user_id: user.id })
            .eq("id", emailMatch.id);
          tenant = emailMatch;
        }
      }

      if (tenant) {
        setTenantData({
          name: tenant.name,
          phone: tenant.phone,
          email: tenant.email,
          room: (tenant.rooms as { number: string } | null)?.number || "",
          rent: (tenant.rooms as { rent: number } | null)?.rent || 0,
          joinDate: tenant.join_date || tenant.created_at,
          property: (tenant.properties as { name: string } | null)?.name || "",
        });
      }

      if (!tenant) return;
      const { data: payments } = await supabase
        .from("payments")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (payments) {
        setMyPayments(payments.map((p) => ({
          id: p.id,
          amount: p.amount || 0,
          date: p.created_at || p.date || "",
          method: p.method || "UPI",
          verified: p.verified ?? false,
        })));
      }
    }
    fetchTenantData();
  }, [mode, user?.id]);

  // ─── TENANT DASHBOARD ───────────────────────────────────────────────
  if (mode === "tenant") {
    const myComplaints = complaints.filter((c) => c.tenant === user?.name && c.status !== "Resolved");
    const recentAnnouncements = announcements.slice(0, 3);

    const priorityIcon = {
      urgent: <AlertTriangle size={14} className="text-red-500" />,
      important: <AlertCircle size={14} className="text-amber-500" />,
      normal: <Info size={14} className="text-blue-500" />,
    };

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Welcome, {tenantData?.name || user?.name || "Tenant"}
          </h2>
          <p className="text-sm text-slate-500 mt-1">{t("dashboard.welcomeTenant")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card>
            <Card.Content className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-blue-50 rounded-xl">
                  <Home size={18} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Current Room</p>
                  <p className="text-xl font-bold text-slate-900">{tenantData?.room || "—"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 bg-slate-50 rounded-lg">
                  <p className="text-[10px] text-slate-500 uppercase">Property</p>
                  <p className="text-sm font-semibold text-slate-800">{tenantData?.property || "—"}</p>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg">
                  <p className="text-[10px] text-slate-500 uppercase">Since</p>
                  <p className="text-sm font-semibold text-slate-800">
                    {tenantData?.joinDate ? new Date(tenantData.joinDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "—"}
                  </p>
                </div>
              </div>
            </Card.Content>
          </Card>

          <Card className="overflow-hidden">
            <div className="p-5 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
              <p className="text-sm opacity-80 font-medium">Monthly Rent</p>
              <p className="text-3xl font-bold mt-1">
                {tenantData?.rent ? `₹${tenantData.rent.toLocaleString("en-IN")}` : "—"}
              </p>
              <div className="flex items-center gap-3 mt-3 text-xs opacity-80">
                <span>Due: 1st of month</span>
              </div>
            </div>
            <Card.Content className="p-4">
              <Link
                href="/rent"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <IndianRupee size={15} />
                Pay Now via Razorpay
                <ArrowRight size={14} className="opacity-70" />
              </Link>
            </Card.Content>
          </Card>
        </div>

        <Card>
          <Card.Header className="px-5 pt-5 pb-0">
            <Card.Title className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <User size={15} className="text-blue-500" />
              My Profile
            </Card.Title>
          </Card.Header>
          <Card.Content className="p-5">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <User size={15} className="text-slate-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-500 uppercase font-medium">Full Name</p>
                  <p className="text-sm font-medium text-slate-800 truncate">{tenantData?.name || user?.name || "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <Phone size={15} className="text-slate-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-500 uppercase font-medium">Phone</p>
                  <p className="text-sm font-medium text-slate-800 truncate">{tenantData?.phone || "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <Mail size={15} className="text-slate-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-500 uppercase font-medium">Email</p>
                  <p className="text-sm font-medium text-slate-800 truncate">{tenantData?.email || user?.email || "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <IndianRupee size={15} className="text-slate-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-500 uppercase font-medium">Monthly Rent</p>
                  <p className="text-sm font-medium text-slate-800">{tenantData?.rent ? `₹${tenantData.rent.toLocaleString("en-IN")}` : "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <CalendarDays size={15} className="text-slate-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-500 uppercase font-medium">Move-in Date</p>
                  <p className="text-sm font-medium text-slate-800">
                    {tenantData?.joinDate ? new Date(tenantData.joinDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <ShieldAlert size={15} className="text-slate-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-500 uppercase font-medium">Emergency Contact</p>
                  <p className="text-sm font-medium text-slate-800">Contact admin</p>
                </div>
              </div>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Header className="px-5 pt-5 pb-0">
            <div className="flex items-center justify-between w-full">
              <Card.Title className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Receipt size={15} className="text-emerald-500" />
                Payment History
              </Card.Title>
              <Link href="/rent" className="text-xs text-blue-600 font-medium hover:text-blue-700">
                {t("common.viewAll")}
              </Link>
            </div>
          </Card.Header>
          <Card.Content className="p-5">
            {myPayments.length > 0 ? (
              <div className="space-y-2.5">
                {myPayments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{`₹${p.amount.toLocaleString("en-IN")}`}</p>
                      <p className="text-xs text-slate-500">{new Date(p.date).toLocaleDateString("en-IN")} &middot; {p.method}</p>
                    </div>
                    <Chip size="sm" variant="soft" color={p.verified ? "success" : "default"}>
                      {p.verified ? "Verified" : "Manual"}
                    </Chip>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">No payment history</p>
            )}
          </Card.Content>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card>
            <Card.Header className="px-5 pt-5 pb-0">
              <div className="flex items-center justify-between w-full">
                <Card.Title className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <Megaphone size={15} className="text-purple-500" />
                  Notices
                </Card.Title>
                <Link href="/announcements" className="text-xs text-blue-600 font-medium hover:text-blue-700">
                  {t("common.viewAll")}
                </Link>
              </div>
            </Card.Header>
            <Card.Content className="p-5">
              {recentAnnouncements.length > 0 ? (
                <div className="space-y-3">
                  {recentAnnouncements.map((a) => (
                    <div key={a.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className="mt-0.5">{priorityIcon[a.priority as keyof typeof priorityIcon] || priorityIcon.normal}</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800 truncate">{a.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{a.message}</p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          {new Date(a.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">No notices</p>
              )}
            </Card.Content>
          </Card>

          <Card>
            <Card.Header className="px-5 pt-5 pb-0">
              <div className="flex items-center justify-between w-full">
                <Card.Title className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <AlertCircle size={15} className="text-amber-500" />
                  My Complaints
                </Card.Title>
                <Link href="/complaints" className="text-xs text-blue-600 font-medium hover:text-blue-700">
                  Raise New
                </Link>
              </div>
            </Card.Header>
            <Card.Content className="p-5">
              {myComplaints.length > 0 ? (
                <div className="space-y-2.5">
                  {myComplaints.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{c.title}</p>
                        <p className="text-xs text-slate-500">{c.time}</p>
                      </div>
                      <Chip size="sm" variant="soft" color={c.status === "Open" ? "danger" : "warning"}>
                        {c.status}
                      </Chip>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">No active complaints</p>
              )}
            </Card.Content>
          </Card>
        </div>

        <Card>
          <Card.Header className="px-5 pt-5 pb-0">
            <Card.Title className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <FileText size={15} className="text-slate-500" />
              PG Rules &amp; Policies
            </Card.Title>
          </Card.Header>
          <Card.Content className="p-5">
            {pgData.rules.length > 0 ? (
              <ul className="space-y-2 text-sm text-slate-600">
                {pgData.rules.map((rule, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                    {rule}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">No rules defined yet</p>
            )}
          </Card.Content>
        </Card>

        {/* Support & Help */}
        <Card>
          <Card.Header className="px-5 pt-5 pb-0">
            <Card.Title className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Phone size={15} className="text-indigo-500" />
              Support & Help
            </Card.Title>
          </Card.Header>
          <Card.Content className="p-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <Link
                  href="/complaints"
                  className="flex items-center gap-3 p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <AlertTriangle size={15} className="text-red-500" />
                  <div>
                    <p className="text-[10px] text-red-600 uppercase font-medium">Report Issue</p>
                    <p className="text-sm font-medium text-red-800">Log a complaint</p>
                  </div>
                </Link>
              </div>
              <div className="space-y-3">
                <Link
                  href="/support"
                  className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Info size={15} className="text-blue-500" />
                  <div>
                    <p className="text-[10px] text-blue-600 uppercase font-medium">Help Center</p>
                    <p className="text-sm font-medium text-blue-800">FAQs & emergency contacts</p>
                  </div>
                </Link>
              </div>
            </div>
          </Card.Content>
        </Card>
      </div>
    );
  }

  // ─── OWNER DASHBOARD ────────────────────────────────────────────────
  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter((r) => r.status === "Occupied").length;
  const vacantRooms = rooms.filter((r) => r.status === "Vacant").length;
  const activeTenants = rooms.reduce((sum, r) => sum + r.tenants.length, 0);
  const monthlyRevenue = rooms.filter((r) => r.status === "Occupied").reduce((sum, r) => sum + r.rent, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const profit = monthlyRevenue - totalExpenses;
  const openComplaints = complaints.filter((c) => c.status !== "Resolved").length;
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;


  return (
    <div className="space-y-8">
      {/* KPI Cards Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-slate-200 rounded-xl hover:border-indigo-200 transition-all card-hover">
          <div className="flex justify-between items-start mb-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <BedDouble size={20} className="text-indigo-600" />
            </div>
          </div>
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Rooms</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{totalRooms}</p>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-xl hover:border-blue-200 transition-all card-hover">
          <div className="flex justify-between items-start mb-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <DoorOpen size={20} className="text-blue-600" />
            </div>
            <div className="flex items-end gap-[2px] h-5">
              <div className="bg-blue-400 w-1.5 h-1/2 rounded-t-sm" />
              <div className="bg-blue-500 w-1.5 h-3/4 rounded-t-sm" />
              <div className="bg-blue-500 w-1.5 h-2/3 rounded-t-sm" />
              <div className="bg-blue-600 w-1.5 h-full rounded-t-sm" />
            </div>
          </div>
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Occupied</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{occupiedRooms}</p>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-xl hover:border-emerald-200 transition-all card-hover">
          <div className="flex justify-between items-start mb-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <DoorOpen size={20} className="text-emerald-600" />
            </div>
            <span className="text-[11px] text-slate-400">{occupancyRate}% rate</span>
          </div>
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Vacant</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{vacantRooms}</p>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-xl hover:border-violet-200 transition-all card-hover">
          <div className="flex justify-between items-start mb-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <Users size={20} className="text-violet-600" />
            </div>
          </div>
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Tenants</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{activeTenants}</p>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-xl hover:border-indigo-200 transition-all card-hover">
          <div className="flex justify-between items-start mb-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
              <TrendingUp size={20} className="text-indigo-600" />
            </div>
          </div>
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Monthly Revenue</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{`₹${monthlyRevenue.toLocaleString("en-IN")}`}</p>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-xl hover:border-red-200 transition-all card-hover">
          <div className="flex justify-between items-start mb-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <Clock size={20} className="text-red-600" />
            </div>
          </div>
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Expenses</p>
          <p className="text-3xl font-bold text-red-600 mt-1">{`₹${totalExpenses.toLocaleString("en-IN")}`}</p>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-xl hover:border-amber-200 transition-all card-hover">
          <div className="flex justify-between items-start mb-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <AlertTriangle size={20} className="text-amber-600" />
            </div>
          </div>
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Open Complaints</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{String(openComplaints).padStart(2, "0")}</p>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-xl hover:border-purple-200 transition-all card-hover">
          <div className="flex justify-between items-start mb-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <Megaphone size={20} className="text-purple-600" />
            </div>
          </div>
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Active Notices</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{String(announcements.length).padStart(2, "0")}</p>
        </div>
      </section>

      {/* Financial Summary */}
      <section className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <p className="text-[11px] font-medium text-emerald-600 uppercase tracking-wider">Revenue</p>
          <p className="text-xl font-bold text-emerald-800 mt-1">{`₹${monthlyRevenue.toLocaleString("en-IN")}`}</p>
        </div>
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-[11px] font-medium text-amber-600 uppercase tracking-wider">Expenses</p>
          <p className="text-xl font-bold text-amber-800 mt-1">{`₹${totalExpenses.toLocaleString("en-IN")}`}</p>
        </div>
        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
          <p className="text-[11px] font-medium text-indigo-600 uppercase tracking-wider">Profit</p>
          <p className="text-xl font-bold text-indigo-800 mt-1">{`₹${profit.toLocaleString("en-IN")}`}</p>
        </div>
      </section>

      {/* Notices & Activity */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Notices</h2>

          <div className="space-y-3">
            {announcements.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No notices yet</p>
            ) : (
              announcements.slice(0, 3).map((notice) => {
                const config = notice.priority === "urgent"
                  ? { border: "border-l-red-500", bg: "bg-red-50/50", icon: <AlertTriangle size={16} className="text-red-500" />, label: "URGENT", labelColor: "text-red-600" }
                  : notice.priority === "important"
                  ? { border: "border-l-indigo-500", bg: "bg-indigo-50/50", icon: <Info size={16} className="text-indigo-500" />, label: "IMPORTANT", labelColor: "text-indigo-600" }
                  : { border: "border-l-emerald-500", bg: "bg-emerald-50/50", icon: <Megaphone size={16} className="text-emerald-500" />, label: "GENERAL", labelColor: "text-emerald-600" };

                return (
                  <div key={notice.id} className={`${config.bg} border-l-4 ${config.border} p-4 rounded-r-xl`}>
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/80 flex-shrink-0 flex items-center justify-center">
                        {config.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between items-start mb-0.5">
                          <span className={`text-[10px] font-bold ${config.labelColor} uppercase tracking-wider`}>
                            {config.label}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(notice.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-800 leading-tight">{notice.title}</p>
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">{notice.message}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {pendingVisits.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Visit Requests</span>
                  <Chip size="sm" variant="soft" color="warning">{pendingVisits.length}</Chip>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {pendingVisits.slice(0, 3).map((req) => (
                  <div key={req.id} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-slate-800">{req.name}</p>
                      <span className="text-[10px] text-slate-400">
                        {new Date(req.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mb-2">{req.purpose}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateStatus(req.id, "approved")}
                        className="px-2.5 py-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => updateStatus(req.id, "declined")}
                        className="px-2.5 py-1 text-[11px] font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Recent Payments</h2>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="divide-y divide-slate-100">
              {recentPayments.length === 0 ? (
                <div className="px-4 py-4">
                  <p className="text-sm text-slate-500 text-center">No recent payments</p>
                </div>
              ) : (
                recentPayments.map((payment) => (
                  <div key={payment.id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">
                        {payment.tenant.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-800">{payment.tenant}</p>
                        <p className="text-[10px] text-slate-500">{payment.room}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-600">{`₹${payment.amount.toLocaleString("en-IN")}`}</span>
                  </div>
                ))
              )}
            </div>
            <Link
              href="/rent"
              className="block w-full py-2.5 text-center text-xs text-indigo-600 font-semibold hover:bg-indigo-50/50 transition-colors border-t border-slate-100"
            >
              View All Payments
            </Link>
          </div>
        </div>
      </section>

      {/* Floating Action Button */}
      <div className="fixed bottom-8 right-8 flex flex-col items-end gap-2 z-50">
        {fabOpen && (
          <div className="flex flex-col gap-2 items-end mb-2 animate-in slide-in-from-bottom-2">
            <Link
              href="/tenants"
              className="bg-white text-slate-700 border border-slate-200 shadow-xl px-4 py-2 rounded-full flex items-center gap-2 text-xs font-medium hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-all"
            >
              <UserPlus size={14} />
              Add Tenant
            </Link>
            <Link
              href="/rooms"
              className="bg-white text-slate-700 border border-slate-200 shadow-xl px-4 py-2 rounded-full flex items-center gap-2 text-xs font-medium hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-all"
            >
              <BedDouble size={14} />
              Manage Rooms
            </Link>
            <Link
              href="/complaints"
              className="bg-white text-slate-700 border border-slate-200 shadow-xl px-4 py-2 rounded-full flex items-center gap-2 text-xs font-medium hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 transition-all"
            >
              <ShieldAlert size={14} />
              Complaints
            </Link>
          </div>
        )}
        <button
          onClick={() => setFabOpen(!fabOpen)}
          className="w-14 h-14 rounded-full bg-indigo-600 text-white shadow-[0_8px_30px_rgb(79,70,229,0.4)] flex items-center justify-center active:scale-90 transition-transform hover:bg-indigo-700"
        >
          <span className={`text-2xl transition-transform duration-200 ${fabOpen ? "rotate-45" : ""}`}>+</span>
        </button>
      </div>
    </div>
  );
}
