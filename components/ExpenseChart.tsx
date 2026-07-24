"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Card } from "@heroui/react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useExpenses } from "@/lib/ExpenseContext";

const COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#8b5cf6", "#ef4444", "#06b6d4"];

export default function ExpenseChart() {
  const { t } = useLanguage();
  const { expenses, loading } = useExpenses();

  const labelMap: Record<string, string> = {
    Maintenance: t("chart.maintenance"),
    Electricity: t("chart.electricity"),
    "Staff Salary": t("chart.staffSalary"),
  };

  const expenseData = useMemo(() => {
    if (expenses.length === 0) return [];

    const grouped: Record<string, number> = {};
    expenses.forEach((e) => {
      grouped[e.category] = (grouped[e.category] || 0) + e.amount;
    });

    const total = Object.values(grouped).reduce((sum, v) => sum + v, 0);
    if (total === 0) return [];

    return Object.entries(grouped).map(([name, amount], i) => ({
      name,
      value: Math.round((amount / total) * 100),
      color: COLORS[i % COLORS.length],
    }));
  }, [expenses]);

  if (loading) {
    return (
      <Card>
        <Card.Header className="px-5 pt-5 pb-0">
          <Card.Title className="text-sm font-semibold text-slate-800">
            {t("chart.expenseMix")}
          </Card.Title>
        </Card.Header>
        <Card.Content className="px-5 pb-5 pt-4">
          <p className="text-sm text-slate-400 text-center py-8">Loading...</p>
        </Card.Content>
      </Card>
    );
  }

  if (expenseData.length === 0) {
    return (
      <Card>
        <Card.Header className="px-5 pt-5 pb-0">
          <Card.Title className="text-sm font-semibold text-slate-800">
            {t("chart.expenseMix")}
          </Card.Title>
        </Card.Header>
        <Card.Content className="px-5 pb-5 pt-4">
          <p className="text-sm text-slate-400 text-center py-8">No expense data</p>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card>
      <Card.Header className="px-5 pt-5 pb-0">
        <Card.Title className="text-sm font-semibold text-slate-800">
          {t("chart.expenseMix")}
        </Card.Title>
      </Card.Header>
      <Card.Content className="px-5 pb-5 pt-4">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={expenseData}
              cx="50%"
              cy="50%"
              outerRadius={75}
              dataKey="value"
              label={({ name, value }: { name?: string; value?: number }) => `${(name && labelMap[name]) || name} ${value}%`}
              labelLine={false}
            >
              {expenseData.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-4 mt-2 flex-wrap">
          {expenseData.map((entry) => (
            <div key={entry.name} className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs text-slate-600">
                {labelMap[entry.name] || entry.name} ({entry.value}%)
              </span>
            </div>
          ))}
        </div>
      </Card.Content>
    </Card>
  );
}
