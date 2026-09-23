"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "./supabase";
import { usePropertyContext } from "./PropertyContext";

import { DEMO_WEEKLY_MENU, emptyWeeklyMenu, normalizeWeeklyMenu, type WeeklyMenu } from "@/lib/food-menu";
import { useAuth } from "./AuthContext";
import { DEMO_PROPERTY_NAME, isDemoUserEmail } from "./demo-accounts";

export interface PGSettings {
  rentDueDay: number;
  lateFeeAmount: number;
  lateFeeType: "flat" | "percentage";
  lateFeeGraceDays: number;
  noticePeriodDays: number;
  visitorHours: { start: string; end: string };
  maintenanceSLA: { high: number; medium: number; low: number };
  pgRules: string[];
  depositMultiplier: number;
  checkoutDeductions: { cleaningFee: number; noticePenaltyPerDay: number };
  notifications: {
    paymentReceived: boolean;
    rentOverdue: boolean;
    newComplaint: boolean;
    visitorCheckIn: boolean;
    monthlyReports: boolean;
  };
  upiId: string;
  foodIncluded: boolean;
  weeklyMenu: WeeklyMenu;
}

const DEFAULT_SETTINGS: PGSettings = {
  rentDueDay: 1,
  lateFeeAmount: 500,
  lateFeeType: "flat",
  lateFeeGraceDays: 5,
  noticePeriodDays: 30,
  visitorHours: { start: "08:00", end: "21:00" },
  maintenanceSLA: { high: 24, medium: 72, low: 168 },
  pgRules: [],
  depositMultiplier: 2,
  checkoutDeductions: { cleaningFee: 2000, noticePenaltyPerDay: 500 },
  notifications: {
    paymentReceived: true,
    rentOverdue: true,
    newComplaint: true,
    visitorCheckIn: false,
    monthlyReports: true,
  },
  upiId: "",
  foodIncluded: false,
  weeklyMenu: emptyWeeklyMenu(),
};

interface SettingsContextType {
  settings: PGSettings;
  loading: boolean;
  updateSettings: (partial: Partial<PGSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULT_SETTINGS,
  loading: true,
  updateSettings: async () => {},
  resetSettings: async () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { propertyId, property } = usePropertyContext();
  const { user } = useAuth();
  const [settings, setSettings] = useState<PGSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role === "tenant") {
      if (!user.id) {
        setSettings(DEFAULT_SETTINGS);
        setLoading(false);
        return;
      }
    } else if (!propertyId) {
      setSettings(DEFAULT_SETTINGS);
      setLoading(false);
      return;
    }

    (async () => {
      if (user?.role === "tenant" && user.id) {
        const params = new URLSearchParams({ userId: user.id });
        if (user.email) params.set("email", user.email);
        const res = await fetch(`/api/tenant-settings?${params}`);
        const data = await res.json().catch(() => ({}));

        let foodIncluded = !!data.foodIncluded;
        let weeklyMenu = normalizeWeeklyMenu(data.weeklyMenu);

        if (
          !foodIncluded &&
          isDemoUserEmail(user.email) &&
          (property?.name === DEMO_PROPERTY_NAME || !property)
        ) {
          foodIncluded = true;
          weeklyMenu = DEMO_WEEKLY_MENU;
        }

        setSettings((prev) => ({
          ...prev,
          upiId: data.upiId ?? prev.upiId,
          foodIncluded,
          weeklyMenu,
        }));
        setLoading(false);
        return;
      }

      if (!propertyId) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("settings")
        .select("*")
        .eq("property_id", propertyId)
        .maybeSingle();

      if (data) {
        setSettingsId(data.id);
        const weeklyMenu = normalizeWeeklyMenu(data.weekly_menu);
        const foodIncluded =
          data.food_included === true ||
          Object.values(weeklyMenu).some((d) => d.breakfast || d.lunch || d.dinner);
        setSettings({
          rentDueDay: data.rent_due_day ?? DEFAULT_SETTINGS.rentDueDay,
          lateFeeAmount: data.late_fee_amount ?? DEFAULT_SETTINGS.lateFeeAmount,
          lateFeeType: (data.late_fee_type as "flat" | "percentage") ?? DEFAULT_SETTINGS.lateFeeType,
          lateFeeGraceDays: data.late_fee_grace_days ?? DEFAULT_SETTINGS.lateFeeGraceDays,
          noticePeriodDays: data.notice_period_days ?? DEFAULT_SETTINGS.noticePeriodDays,
          visitorHours: data.visitor_hours ?? DEFAULT_SETTINGS.visitorHours,
          maintenanceSLA: data.maintenance_sla ?? DEFAULT_SETTINGS.maintenanceSLA,
          pgRules: data.pg_rules ?? DEFAULT_SETTINGS.pgRules,
          depositMultiplier: data.deposit_multiplier ?? DEFAULT_SETTINGS.depositMultiplier,
          checkoutDeductions: data.checkout_deductions ?? DEFAULT_SETTINGS.checkoutDeductions,
          notifications: data.notifications ?? DEFAULT_SETTINGS.notifications,
          upiId: data.upi_id ?? DEFAULT_SETTINGS.upiId,
          foodIncluded,
          weeklyMenu,
        });
      }
      setLoading(false);
    })();
  }, [propertyId, user?.id, user?.role, user?.email, property?.name]);

  const updateSettings = useCallback(async (partial: Partial<PGSettings>) => {
    const newSettings = { ...settings, ...partial };
    setSettings(newSettings);

    if (!propertyId) return;

    const row: Record<string, unknown> = {
      property_id: propertyId,
      rent_due_day: newSettings.rentDueDay,
      late_fee_amount: newSettings.lateFeeAmount,
      late_fee_type: newSettings.lateFeeType,
      late_fee_grace_days: newSettings.lateFeeGraceDays,
      notice_period_days: newSettings.noticePeriodDays,
      visitor_hours: newSettings.visitorHours,
      maintenance_sla: newSettings.maintenanceSLA,
      pg_rules: newSettings.pgRules,
      deposit_multiplier: newSettings.depositMultiplier,
      checkout_deductions: newSettings.checkoutDeductions,
      notifications: newSettings.notifications,
      upi_id: newSettings.upiId,
      food_included: newSettings.foodIncluded,
      weekly_menu: newSettings.weeklyMenu,
    };

    if (settingsId) {
      let { error } = await supabase.from("settings").update(row).eq("id", settingsId);
      if (error?.message?.includes("food_included")) {
        delete row.food_included;
        delete row.weekly_menu;
        await supabase.from("settings").update(row).eq("id", settingsId);
      }
    } else {
      let { data, error } = await supabase.from("settings").insert(row).select().single();
      if (error?.message?.includes("food_included")) {
        delete row.food_included;
        delete row.weekly_menu;
        const retry = await supabase.from("settings").insert(row).select().single();
        data = retry.data;
      }
      if (data) setSettingsId(data.id);
    }
  }, [settings, propertyId, settingsId]);

  const resetSettings = useCallback(async () => {
    setSettings(DEFAULT_SETTINGS);
    if (settingsId) {
      await supabase.from("settings").delete().eq("id", settingsId);
      setSettingsId(null);
    }
  }, [settingsId]);

  return (
    <SettingsContext.Provider value={{ settings, loading, updateSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
