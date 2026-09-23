"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useUserMode } from "@/lib/UserModeContext";
import { useAuth } from "@/lib/AuthContext";
import { usePGData } from "@/lib/usePGData";
import { useComplaints } from "@/lib/ComplaintContext";
import { usePropertyContext } from "@/lib/PropertyContext";
import { useSettings } from "@/lib/SettingsContext";
import { DAY_KEYS, DAY_LABELS } from "@/lib/food-menu";
import { supabase } from "@/lib/supabase";
import { Card, Chip } from "@heroui/react";
import {
  Clock, CalendarDays, IndianRupee, AlertTriangle, AlertCircle,
  Info, Building2, DoorOpen, Users, User, Phone, Mail, Home,
  BedDouble, TrendingUp, Receipt, ShieldAlert, FileText, ArrowRight, UtensilsCrossed,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function Dashboard() {
  const { t } = useLanguage();
  const { mode } = useUserMode();
  const { user } = useAuth();
  const pgData = usePGData();
  const rooms = pgData.rooms;
  const { complaints } = useComplaints();
  const { property } = usePropertyContext();
  const { settings, loading: settingsLoading } = useSettings();
  const [fabOpen, setFabOpen] = useState(false);
  const [recentPayments, setRecentPayments] = useState<Array<{ id: string; tenant: string; room: string; amount: number }>>([]);
  const [tenantData, setTenantData] = useState<{ id?: string; name?: string; phone?: string; email?: string; room?: string; rent?: number; joinDate?: string; property?: string; upiId?: string } | null>(null);
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

  // Fetch tenant-specific data via API (bypasses RLS)
  useEffect(() => {
    async function fetchTenantData() {
      if (mode !== "tenant" || !user?.id) return;

      const params = new URLSearchParams({ userId: user.id });
      if (user.email) params.set("email", user.email);

      const res = await fetch(`/api/tenant-data?${params}`);
      if (!res.ok) return;
      const data = await res.json();

      if (data.tenant) {
        setTenantData({
          id: data.tenant.id,
          name: data.tenant.name,
          phone: data.tenant.phone,
          email: data.tenant.email,
          room: data.tenant.room,
          rent: data.tenant.rent,
          joinDate: data.tenant.joinDate,
          property: data.tenant.property,
          upiId: data.upiId || "",
        });
      }

      if (data.payments) {
        setMyPayments(data.payments.map((p: { id: string; amount: number; date: string; method: string; verified: boolean }) => ({
          id: p.id,
          amount: p.amount,
          date: p.date || "",
          method: p.method,
          verified: p.verified,
        })));
      }
    }
    fetchTenantData();
  }, [mode, user?.id]);

  // ─── TENANT DASHBOARD ───────────────────────────────────────────────
  if (mode === "tenant") {
    const myComplaints = complaints.filter((c) => c.tenantId === tenantData?.id && c.status !== "Resolved");
    const todayKey = DAY_KEYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
    const todayMeals = settings.weeklyMenu[todayKey];
    const showFoodCard = !settingsLoading && settings.foodIncluded;

    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            Welcome, {tenantData?.name || user?.name || "Tenant"}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1">{t("dashboard.welcomeTenant")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5">
          <Card>
            <Card.Content className="p-4 sm:p-5">
              <div className="flex items-center gap-2.5 sm:gap-3 mb-3 sm:mb-4">
                <div className="p-2 sm:p-2.5 bg-emerald-50 rounded-xl">
                  <Home size={16} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 uppercase tracking-wider">Current Room</p>
                  <p className="text-lg sm:text-xl font-bold text-slate-900">{tenantData?.room || "—"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="p-2 sm:p-2.5 bg-emerald-50/50 rounded-lg">
                  <p className="text-[9px] sm:text-[10px] text-slate-500 uppercase">Property</p>
                  <p className="text-xs sm:text-sm font-semibold text-slate-800 truncate">{tenantData?.property || "—"}</p>
                </div>
                <div className="p-2 sm:p-2.5 bg-emerald-50/50 rounded-lg">
                  <p className="text-[9px] sm:text-[10px] text-slate-500 uppercase">Since</p>
                  <p className="text-xs sm:text-sm font-semibold text-slate-800">
                    {tenantData?.joinDate ? new Date(tenantData.joinDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "—"}
                  </p>
                </div>
              </div>
            </Card.Content>
          </Card>

          <Card className="overflow-hidden">
            <div className="p-4 sm:p-5 bg-gradient-to-br from-emerald-600 to-teal-700 text-white">
              <p className="text-xs sm:text-sm opacity-80 font-medium">Monthly Rent</p>
              <p className="text-2xl sm:text-3xl font-bold mt-0.5 sm:mt-1">
                {tenantData?.rent ? `₹${tenantData.rent.toLocaleString("en-IN")}` : "—"}
              </p>
              <div className="flex items-center gap-3 mt-2 sm:mt-3 text-[11px] sm:text-xs opacity-80">
                <span>Due: 1st of month</span>
              </div>
            </div>
            {tenantData?.upiId ? (
              <div className="p-4 space-y-3">
                <button
                  onClick={() => {
                    const month = new Date().toLocaleString("en-IN", { month: "long" });
                    const upiLink = `upi://pay?pa=${tenantData.upiId}&pn=${encodeURIComponent(tenantData.property || "PG")}&am=${tenantData.rent}&cu=INR&tn=Rent+${month}`;
                    window.open(upiLink, "_blank");
                  }}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <IndianRupee size={15} />
                  Pay Rent via UPI
                </button>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase">UPI ID</p>
                    <p className="text-sm font-medium text-slate-800">{tenantData.upiId}</p>
                  </div>
                  <button
                    onClick={() => { navigator.clipboard.writeText(tenantData.upiId || ""); }}
                    className="text-xs text-emerald-600 font-medium hover:text-emerald-700 px-2 py-1 bg-emerald-50 rounded"
                  >
                    Copy
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-4 py-3">
                <p className="text-xs text-slate-400 text-center">UPI payment not set up by owner</p>
              </div>
            )}
          </Card>
        </div>

        {showFoodCard && (
          <Card className="border-[var(--teal)]/20 bg-gradient-to-br from-[var(--teal)]/5 to-[var(--surface)]">
            <Card.Content className="p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--teal)] text-white">
                      <UtensilsCrossed size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{t("foodMenu.today")}&apos;s meals</p>
                      <p className="text-xs text-slate-500">{DAY_LABELS[todayKey]}</p>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)]/90 px-3 py-2">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                        {t("foodMenu.breakfast")}
                      </p>
                      <p className="mt-0.5 text-sm text-slate-800">{todayMeals.breakfast || "—"}</p>
                    </div>
                    <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)]/90 px-3 py-2">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                        {t("foodMenu.lunch")}
                      </p>
                      <p className="mt-0.5 text-sm text-slate-800">{todayMeals.lunch || "—"}</p>
                    </div>
                    <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)]/90 px-3 py-2">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                        {t("foodMenu.dinner")}
                      </p>
                      <p className="mt-0.5 text-sm text-slate-800">{todayMeals.dinner || "—"}</p>
                    </div>
                  </div>
                </div>
                <Link
                  href="/food-menu"
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[var(--teal)]/30 bg-[var(--surface)] px-4 py-2.5 text-sm font-medium text-[var(--teal-deep)] transition hover:bg-[var(--teal)]/10"
                >
                  {t("nav.foodMenu")}
                  <ArrowRight size={14} />
                </Link>
              </div>
            </Card.Content>
          </Card>
        )}

        <Card>
          <Card.Header className="px-4 sm:px-5 pt-4 sm:pt-5 pb-0">
            <Card.Title className="text-xs sm:text-sm font-semibold text-slate-800 flex items-center gap-2">
              <User size={14} className="text-emerald-500" />
              My Profile
            </Card.Title>
          </Card.Header>
          <Card.Content className="p-3 sm:p-5">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
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

        <Card>
            <Card.Header className="px-5 pt-5 pb-0">
              <div className="flex items-center justify-between w-full">
                <Card.Title className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <AlertCircle size={15} className="text-amber-500" />
                  My Complaints
                </Card.Title>
                <Link href="/complaints" className="text-xs text-emerald-600 font-medium hover:text-emerald-700">
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


        {/* Support & Help */}
        <Card>
          <Card.Header className="px-5 pt-5 pb-0">
            <Card.Title className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Phone size={15} className="text-emerald-500" />
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
                  className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
                >
                  <Info size={15} className="text-emerald-500" />
                  <div>
                    <p className="text-[10px] text-emerald-600 uppercase font-medium">Help Center</p>
                    <p className="text-sm font-medium text-emerald-800">FAQs & emergency contacts</p>
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
  const openComplaints = complaints.filter((c) => c.status !== "Resolved").length;
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;


  return (
    <div className="space-y-5 sm:space-y-8">
      {/* KPI Cards Grid */}
      <section className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="p-3 sm:p-5 bg-white border border-slate-200 rounded-xl hover:border-indigo-200 transition-all card-hover">
          <div className="flex justify-between items-start mb-2 sm:mb-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <BedDouble size={16} className="sm:hidden text-indigo-600" />
              <BedDouble size={20} className="hidden sm:block text-indigo-600" />
            </div>
          </div>
          <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Rooms</p>
          <p className="text-xl sm:text-3xl font-bold text-slate-900 mt-0.5 sm:mt-1">{totalRooms}</p>
        </div>

        <div className="p-3 sm:p-5 bg-white border border-slate-200 rounded-xl hover:border-blue-200 transition-all card-hover">
          <div className="flex justify-between items-start mb-2 sm:mb-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <DoorOpen size={16} className="sm:hidden text-blue-600" />
              <DoorOpen size={20} className="hidden sm:block text-blue-600" />
            </div>
            <div className="hidden sm:flex items-end gap-[2px] h-5">
              <div className="bg-blue-400 w-1.5 h-1/2 rounded-t-sm" />
              <div className="bg-blue-500 w-1.5 h-3/4 rounded-t-sm" />
              <div className="bg-blue-500 w-1.5 h-2/3 rounded-t-sm" />
              <div className="bg-blue-600 w-1.5 h-full rounded-t-sm" />
            </div>
          </div>
          <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 uppercase tracking-wider">Occupied</p>
          <p className="text-xl sm:text-3xl font-bold text-slate-900 mt-0.5 sm:mt-1">{occupiedRooms}</p>
        </div>

        <div className="p-3 sm:p-5 bg-white border border-slate-200 rounded-xl hover:border-emerald-200 transition-all card-hover">
          <div className="flex justify-between items-start mb-2 sm:mb-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <DoorOpen size={16} className="sm:hidden text-emerald-600" />
              <DoorOpen size={20} className="hidden sm:block text-emerald-600" />
            </div>
            <span className="hidden sm:inline text-[11px] text-slate-400">{occupancyRate}% rate</span>
          </div>
          <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 uppercase tracking-wider">Vacant</p>
          <p className="text-xl sm:text-3xl font-bold text-slate-900 mt-0.5 sm:mt-1">{vacantRooms}</p>
        </div>

        <div className="p-3 sm:p-5 bg-white border border-slate-200 rounded-xl hover:border-violet-200 transition-all card-hover">
          <div className="flex justify-between items-start mb-2 sm:mb-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <Users size={16} className="sm:hidden text-violet-600" />
              <Users size={20} className="hidden sm:block text-violet-600" />
            </div>
          </div>
          <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Tenants</p>
          <p className="text-xl sm:text-3xl font-bold text-slate-900 mt-0.5 sm:mt-1">{activeTenants}</p>
        </div>

        <div className="p-3 sm:p-5 bg-white border border-slate-200 rounded-xl hover:border-indigo-200 transition-all card-hover">
          <div className="flex justify-between items-start mb-2 sm:mb-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
              <TrendingUp size={16} className="sm:hidden text-indigo-600" />
              <TrendingUp size={20} className="hidden sm:block text-indigo-600" />
            </div>
          </div>
          <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 uppercase tracking-wider">Revenue</p>
          <p className="text-lg sm:text-3xl font-bold text-slate-900 mt-0.5 sm:mt-1">{`₹${monthlyRevenue.toLocaleString("en-IN")}`}</p>
        </div>


        <div className="p-3 sm:p-5 bg-white border border-slate-200 rounded-xl hover:border-amber-200 transition-all card-hover">
          <div className="flex justify-between items-start mb-2 sm:mb-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <AlertTriangle size={16} className="sm:hidden text-amber-600" />
              <AlertTriangle size={20} className="hidden sm:block text-amber-600" />
            </div>
          </div>
          <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 uppercase tracking-wider">Complaints</p>
          <p className="text-xl sm:text-3xl font-bold text-slate-900 mt-0.5 sm:mt-1">{String(openComplaints).padStart(2, "0")}</p>
        </div>

      </section>


      {/* Recent Payments */}
      <section>
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

      {/* Recent Complaints */}
      {complaints.filter((c) => c.status !== "Resolved").length > 0 && (
        <section>
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Recent Complaints</h2>
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="divide-y divide-slate-100">
                {complaints
                  .filter((c) => c.status !== "Resolved")
                  .slice(0, 5)
                  .map((c) => (
                    <div key={c.id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${c.priority === "High" ? "bg-red-100 text-red-700" : c.priority === "Medium" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                          {c.priority[0]}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-800">{c.title}</p>
                          <p className="text-[10px] text-slate-500">{c.tenant} &middot; Room {c.room}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${c.status === "Open" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}>
                        {c.status}
                      </span>
                    </div>
                  ))}
              </div>
              <Link
                href="/notifications"
                className="block w-full py-2.5 text-center text-xs text-indigo-600 font-semibold hover:bg-indigo-50/50 transition-colors border-t border-slate-100"
              >
                View All Notifications
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Floating Action Button */}
      <div className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 flex flex-col items-end gap-2 z-50">
        {fabOpen && (
          <div className="flex flex-col gap-2 items-end mb-2 animate-in slide-in-from-bottom-2">
            <Link
              href="/tenants"
              className="bg-white text-slate-700 border border-slate-200 shadow-xl px-3 sm:px-4 py-1.5 sm:py-2 rounded-full flex items-center gap-2 text-[11px] sm:text-xs font-medium hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-all"
            >
              <Users size={13} />
              Tenants
            </Link>
            <Link
              href="/rooms"
              className="bg-white text-slate-700 border border-slate-200 shadow-xl px-3 sm:px-4 py-1.5 sm:py-2 rounded-full flex items-center gap-2 text-[11px] sm:text-xs font-medium hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-all"
            >
              <BedDouble size={13} />
              Rooms
            </Link>
          </div>
        )}
        <button
          onClick={() => setFabOpen(!fabOpen)}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-indigo-600 text-white shadow-[0_8px_30px_rgb(79,70,229,0.4)] flex items-center justify-center active:scale-90 transition-transform hover:bg-indigo-700"
        >
          <span className={`text-xl sm:text-2xl transition-transform duration-200 ${fabOpen ? "rotate-45" : ""}`}>+</span>
        </button>
      </div>
    </div>
  );
}
