"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "./supabase";
import { usePropertyContext } from "./PropertyContext";

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
  const { propertyId } = usePropertyContext();
  const [settings, setSettings] = useState<PGSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  useEffect(() => {
    if (!propertyId) {
      setSettings(DEFAULT_SETTINGS);
      setLoading(false);
      return;
    }

    (async () => {
      const { data } = await supabase
        .from("settings")
        .select("*")
        .eq("property_id", propertyId)
        .maybeSingle();

      if (data) {
        setSettingsId(data.id);
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
        });
      }
      setLoading(false);
    })();
  }, [propertyId]);

  const updateSettings = useCallback(async (partial: Partial<PGSettings>) => {
    const newSettings = { ...settings, ...partial };
    setSettings(newSettings);

    if (!propertyId) return;

    const row = {
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
    };

    if (settingsId) {
      await supabase.from("settings").update(row).eq("id", settingsId);
    } else {
      const { data } = await supabase.from("settings").insert(row).select().single();
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
