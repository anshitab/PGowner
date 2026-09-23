"use client";

import { useEffect, useState } from "react";
import { UtensilsCrossed, Save } from "lucide-react";
import { Card, Button } from "@heroui/react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useUserMode } from "@/lib/UserModeContext";
import { useSettings } from "@/lib/SettingsContext";
import { useRouter } from "next/navigation";
import {
  DAY_KEYS,
  DAY_LABELS,
  type DayKey,
  type WeeklyMenu,
  emptyWeeklyMenu,
} from "@/lib/food-menu";

export default function FoodMenuPage() {
  const { t } = useLanguage();
  const { mode } = useUserMode();
  const router = useRouter();
  const { settings, loading, updateSettings } = useSettings();
  const [draft, setDraft] = useState<WeeklyMenu>(emptyWeeklyMenu());
  const [saving, setSaving] = useState(false);

  const isOwner = mode === "owner";

  useEffect(() => {
    if (loading) return;
    if (!settings.foodIncluded) {
      router.replace(isOwner ? "/settings" : "/dashboard");
    }
  }, [loading, settings.foodIncluded, router, isOwner]);

  useEffect(() => {
    if (!loading) {
      setDraft(settings.weeklyMenu);
    }
  }, [loading, settings.weeklyMenu]);

  if (loading || !settings.foodIncluded) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-slate-500">{t("foodMenu.loading")}</p>
      </div>
    );
  }

  const updateMeal = (day: DayKey, field: "breakfast" | "lunch" | "dinner", value: string) => {
    setDraft((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings({ weeklyMenu: draft });
      toast.success(t("foodMenu.saved"));
    } catch {
      toast.error(t("foodMenu.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const todayKey = DAY_KEYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <UtensilsCrossed size={22} className="text-[var(--teal)]" />
            <h2 className="text-xl font-bold text-slate-900">{t("foodMenu.title")}</h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {isOwner ? t("foodMenu.subtitleOwner") : t("foodMenu.subtitleTenant")}
          </p>
        </div>
        {isOwner && (
          <Button variant="primary" size="sm" onPress={handleSave} isDisabled={saving}>
            <Save size={14} />
            {saving ? t("foodMenu.saving") : t("foodMenu.saveMenu")}
          </Button>
        )}
      </div>

      <Card className="border-[var(--teal)]/20 bg-[var(--teal)]/5">
        <Card.Content className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--teal-deep)]">
            {t("foodMenu.today")}
          </p>
          <p className="mt-1 text-sm font-medium text-slate-900">{DAY_LABELS[todayKey]}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3 text-sm text-slate-700">
            <p>
              <span className="font-medium text-slate-500">{t("foodMenu.breakfast")}: </span>
              {draft[todayKey].breakfast || "—"}
            </p>
            <p>
              <span className="font-medium text-slate-500">{t("foodMenu.lunch")}: </span>
              {draft[todayKey].lunch || "—"}
            </p>
            <p>
              <span className="font-medium text-slate-500">{t("foodMenu.dinner")}: </span>
              {draft[todayKey].dinner || "—"}
            </p>
          </div>
        </Card.Content>
      </Card>

      <Card>
        <Card.Content className="p-0 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">{t("foodMenu.day")}</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">{t("foodMenu.breakfast")}</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">{t("foodMenu.lunch")}</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">{t("foodMenu.dinner")}</th>
              </tr>
            </thead>
            <tbody>
              {DAY_KEYS.map((day) => {
                const isToday = day === todayKey;
                return (
                  <tr
                    key={day}
                    className={`border-b border-slate-50 ${isToday ? "bg-[var(--teal)]/5" : ""}`}
                  >
                    <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                      {DAY_LABELS[day]}
                      {isToday && (
                        <span className="ml-2 text-[10px] font-semibold uppercase text-[var(--teal)]">
                          {t("foodMenu.todayBadge")}
                        </span>
                      )}
                    </td>
                    {(["breakfast", "lunch", "dinner"] as const).map((meal) => (
                      <td key={meal} className="px-4 py-2 align-top">
                        {isOwner ? (
                          <input
                            type="text"
                            value={draft[day][meal]}
                            onChange={(e) => updateMeal(day, meal, e.target.value)}
                            placeholder={t("foodMenu.placeholder")}
                            className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal)]/20 focus:border-[var(--teal)]"
                          />
                        ) : (
                          <span className="text-slate-700">{draft[day][meal] || "—"}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card.Content>
      </Card>
    </div>
  );
}
