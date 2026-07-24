"use client";

import { TrendingUp, Clock, AlertTriangle, Calendar } from "lucide-react";
import { Card, Chip } from "@heroui/react";

const typeConfig = {
  positive: {
    icon: TrendingUp,
    bgColor: "bg-emerald-50",
    iconColor: "text-emerald-600",
    chipColor: "success" as const,
  },
  warning: {
    icon: Clock,
    bgColor: "bg-amber-50",
    iconColor: "text-amber-600",
    chipColor: "warning" as const,
  },
  danger: {
    icon: AlertTriangle,
    bgColor: "bg-red-50",
    iconColor: "text-red-600",
    chipColor: "danger" as const,
  },
  info: {
    icon: Calendar,
    bgColor: "bg-blue-50",
    iconColor: "text-blue-600",
    chipColor: "accent" as const,
  },
};

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  changeType: "positive" | "warning" | "danger" | "info";
}

export default function MetricCard({
  title,
  value,
  change,
  changeType,
}: MetricCardProps) {
  const config = typeConfig[changeType];
  const Icon = config.icon;

  return (
    <Card className="card-hover">
      <Card.Content className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-slate-500">{title}</span>
          <div className={`p-2 rounded-lg ${config.bgColor}`}>
            <Icon size={18} className={config.iconColor} />
          </div>
        </div>
        <p className="text-2xl font-bold text-slate-900 mb-2">{value}</p>
        <Chip size="sm" color={config.chipColor} variant="soft">
          {change}
        </Chip>
      </Card.Content>
    </Card>
  );
}
