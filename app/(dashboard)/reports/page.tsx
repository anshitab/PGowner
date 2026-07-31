"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";
import { Download, TrendingUp, Users, IndianRupee, Home } from "lucide-react";
import { Card, Button } from "@heroui/react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useUserMode } from "@/lib/UserModeContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const monthlyRevenue = [
  { month: "Jan", revenue: 240000 },
  { month: "Feb", revenue: 280000 },
  { month: "Mar", revenue: 320000 },
  { month: "Apr", revenue: 380000 },
  { month: "May", revenue: 440000 },
  { month: "Jun", revenue: 500000 },
];

const occupancyTrend = [
  { month: "Jan", rate: 78 },
  { month: "Feb", rate: 80 },
  { month: "Mar", rate: 82 },
  { month: "Apr", rate: 84 },
  { month: "May", rate: 83 },
  { month: "Jun", rate: 85 },
];

const complaintsByCategory = [
  { name: "Plumbing", value: 35, color: "#3b82f6" },
  { name: "Electrical", value: 25, color: "#f59e0b" },
  { name: "AC/Cooling", value: 20, color: "#22c55e" },
  { name: "Security", value: 12, color: "#ef4444" },
  { name: "Others", value: 8, color: "#8b5cf6" },
];

export default function ReportsPage() {
  const { t } = useLanguage();
  const { mode } = useUserMode();
  const router = useRouter();

  useEffect(() => {
    if (mode === "tenant") router.replace("/dashboard");
  }, [mode, router]);

  if (mode === "tenant") return null;

  const kpis = [
    { label: t("reports.totalRevenue"), value: "₹21.6L", icon: IndianRupee, bg: "bg-emerald-50", iconColor: "text-emerald-600" },
    { label: t("reports.revenueGrowth"), value: "+108%", icon: TrendingUp, bg: "bg-blue-50", iconColor: "text-blue-600" },
    { label: t("reports.avgOccupancy"), value: "82%", icon: Users, bg: "bg-violet-50", iconColor: "text-violet-600" },
    { label: t("reports.propertiesManaged"), value: "3", icon: Home, bg: "bg-amber-50", iconColor: "text-amber-600" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t("reports.title")}</h2>
          <p className="text-sm text-slate-500 mt-1">{t("reports.subtitle")}</p>
        </div>
        <Button variant="outline" size="sm">
          <Download size={14} />
          {t("common.downloadReport")}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <Card key={i} className="card-hover">
              <Card.Content className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${kpi.bg}`}>
                    <Icon size={18} className={kpi.iconColor} />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{kpi.label}</p>
                    <p className="text-lg font-bold text-slate-900">{kpi.value}</p>
                  </div>
                </div>
              </Card.Content>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <Card.Header className="px-5 pt-5 pb-0">
            <Card.Title className="text-sm font-semibold text-slate-800">{t("reports.monthlyRevenue")}</Card.Title>
          </Card.Header>
          <Card.Content className="px-5 pb-5 pt-4">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
                <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString("en-IN")}`]} contentStyle={{ borderRadius: "10px", border: "1px solid #e2e8f0", boxShadow: "0 4px 12px -2px rgb(0 0 0 / 0.08)", fontSize: "12px" }} />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </Card.Content>
        </Card>

        <Card>
          <Card.Header className="px-5 pt-5 pb-0">
            <Card.Title className="text-sm font-semibold text-slate-800">{t("reports.occupancyTrend")}</Card.Title>
          </Card.Header>
          <Card.Content className="px-5 pb-5 pt-4">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={occupancyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} domain={[70, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(value) => [`${value}%`, "Occupancy"]} contentStyle={{ borderRadius: "10px", border: "1px solid #e2e8f0", boxShadow: "0 4px 12px -2px rgb(0 0 0 / 0.08)", fontSize: "12px" }} />
                <Line type="monotone" dataKey="rate" stroke="#22c55e" strokeWidth={2.5} dot={{ fill: "#22c55e", r: 3, strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }} />
              </LineChart>
            </ResponsiveContainer>
          </Card.Content>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <Card.Header className="px-5 pt-5 pb-0">
            <Card.Title className="text-sm font-semibold text-slate-800">{t("reports.complaintsByCategory")}</Card.Title>
          </Card.Header>
          <Card.Content className="px-5 pb-5 pt-4">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={complaintsByCategory} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name} (${value}%)`} labelLine={false}>
                  {complaintsByCategory.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {complaintsByCategory.map((entry) => (
                <div key={entry.name} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-[11px] text-slate-600">{entry.name}</span>
                </div>
              ))}
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Header className="px-5 pt-5 pb-0">
            <Card.Title className="text-sm font-semibold text-slate-800">{t("reports.keyInsights")}</Card.Title>
          </Card.Header>
          <Card.Content className="px-5 pb-5 pt-4">
            <div className="space-y-3">
              <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-100">
                <p className="text-sm font-medium text-emerald-800">{t("reports.insight1Title")}</p>
                <p className="text-xs text-emerald-600 mt-0.5">{t("reports.insight1Desc")}</p>
              </div>
              <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-sm font-medium text-blue-800">{t("reports.insight2Title")}</p>
                <p className="text-xs text-blue-600 mt-0.5">{t("reports.insight2Desc")}</p>
              </div>
              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-sm font-medium text-amber-800">{t("reports.insight3Title")}</p>
                <p className="text-xs text-amber-600 mt-0.5">{t("reports.insight3Desc")}</p>
              </div>
              <div className="p-3.5 bg-violet-50 rounded-xl border border-violet-100">
                <p className="text-sm font-medium text-violet-800">{t("reports.insight4Title")}</p>
                <p className="text-xs text-violet-600 mt-0.5">{t("reports.insight4Desc")}</p>
              </div>
            </div>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
}
