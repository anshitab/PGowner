"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Card } from "@heroui/react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { usePGData } from "@/lib/usePGData";

export default function OccupancyChart() {
  const { t } = useLanguage();
  const { beds, loading } = usePGData();

  const { occupancyData, occupied, vacant, percent } = useMemo(() => {
    const occupiedCount = beds.filter((b) => b.status === "occupied").length;
    const vacantCount = beds.filter((b) => b.status === "available").length;
    const total = occupiedCount + vacantCount;
    const pct = total > 0 ? Math.round((occupiedCount / total) * 100) : 0;

    return {
      occupancyData: [
        { name: "Occupied", value: occupiedCount, color: "#3b82f6" },
        { name: "Vacant", value: vacantCount, color: "#e2e8f0" },
      ],
      occupied: occupiedCount,
      vacant: vacantCount,
      percent: pct,
    };
  }, [beds]);

  if (loading) {
    return (
      <Card>
        <Card.Header className="px-5 pt-5 pb-0">
          <Card.Title className="text-sm font-semibold text-slate-800">
            {t("chart.occupancyRate")}
          </Card.Title>
        </Card.Header>
        <Card.Content className="px-5 pb-5 pt-4">
          <p className="text-sm text-slate-400 text-center py-8">Loading...</p>
        </Card.Content>
      </Card>
    );
  }

  const total = occupied + vacant;

  return (
    <Card>
      <Card.Header className="px-5 pt-5 pb-0">
        <Card.Title className="text-sm font-semibold text-slate-800">
          {t("chart.occupancyRate")}
        </Card.Title>
      </Card.Header>
      <Card.Content className="px-5 pb-5 pt-4">
        <div className="relative">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={occupancyData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
              >
                {occupancyData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900">{percent}%</p>
              <p className="text-[11px] text-slate-500">{t("chart.occupied")}</p>
            </div>
          </div>
        </div>
        <div className="flex justify-center gap-4 mt-2">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-xs text-slate-600">{occupied} {t("chart.occupied")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
            <span className="text-xs text-slate-600">{vacant} {t("chart.vacant")}</span>
          </div>
        </div>
      </Card.Content>
    </Card>
  );
}
