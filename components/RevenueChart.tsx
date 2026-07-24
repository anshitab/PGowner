"use client";

import { useState, useEffect, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card } from "@heroui/react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { usePropertyContext } from "@/lib/PropertyContext";
import { supabase } from "@/lib/supabase";

interface RevenuePoint {
  month: string;
  revenue: number;
}

export default function RevenueChart() {
  const { t } = useLanguage();
  const { propertyId } = usePropertyContext();
  const [revenueData, setRevenueData] = useState<RevenuePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRevenue() {
      if (!propertyId) {
        setRevenueData([]);
        setLoading(false);
        return;
      }

      // Fetch payments from the last 6 months grouped by month
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      sixMonthsAgo.setDate(1);
      const startDate = sixMonthsAgo.toISOString().split("T")[0];

      const { data } = await supabase
        .from("payments")
        .select("amount, date")
        .eq("property_id", propertyId)
        .gte("date", startDate)
        .order("date");

      if (data && data.length > 0) {
        const grouped: Record<string, number> = {};
        data.forEach((p) => {
          const d = new Date(p.date);
          const key = d.toLocaleString("en-IN", { month: "short" });
          grouped[key] = (grouped[key] || 0) + (p.amount || 0);
        });

        setRevenueData(
          Object.entries(grouped).map(([month, revenue]) => ({ month, revenue }))
        );
      } else {
        setRevenueData([]);
      }
      setLoading(false);
    }

    fetchRevenue();
  }, [propertyId]);

  if (loading) {
    return (
      <Card>
        <Card.Header className="px-5 pt-5 pb-0">
          <Card.Title className="text-sm font-semibold text-slate-800">
            {t("chart.revenueGrowth")}
          </Card.Title>
        </Card.Header>
        <Card.Content className="px-5 pb-5 pt-4">
          <p className="text-sm text-slate-400 text-center py-8">Loading...</p>
        </Card.Content>
      </Card>
    );
  }

  if (revenueData.length === 0) {
    return (
      <Card>
        <Card.Header className="px-5 pt-5 pb-0">
          <Card.Title className="text-sm font-semibold text-slate-800">
            {t("chart.revenueGrowth")}
          </Card.Title>
        </Card.Header>
        <Card.Content className="px-5 pb-5 pt-4">
          <p className="text-sm text-slate-400 text-center py-8">No revenue data</p>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card>
      <Card.Header className="px-5 pt-5 pb-0">
        <Card.Title className="text-sm font-semibold text-slate-800">
          {t("chart.revenueGrowth")}
        </Card.Title>
      </Card.Header>
      <Card.Content className="px-5 pb-5 pt-4">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`}
            />
            <Tooltip
              formatter={(value) => [`₹${Number(value).toLocaleString("en-IN")}`, "Revenue"]}
              contentStyle={{
                borderRadius: "10px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 12px -2px rgb(0 0 0 / 0.08)",
                fontSize: "12px",
              }}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#3b82f6"
              strokeWidth={2.5}
              dot={{ fill: "#3b82f6", r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card.Content>
    </Card>
  );
}
