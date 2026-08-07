"use client";

import { User, Shield, ScrollText, Plus, Trash2, GripVertical } from "lucide-react";
import { useState, useEffect } from "react";
import { Card, Button, Avatar, AvatarFallback } from "@heroui/react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useUserMode } from "@/lib/UserModeContext";
import { useAuth } from "@/lib/AuthContext";
import { useSettings } from "@/lib/SettingsContext";
import { supabase } from "@/lib/supabase";
import { usePropertyContext } from "@/lib/PropertyContext";

const allTabs = [
  { id: "profile", key: "settings.profile", icon: User },
  { id: "security", key: "settings.security", icon: Shield },
  { id: "pgRules", key: "PG Rules", icon: ScrollText, ownerOnly: true },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const { t } = useLanguage();
  const { mode } = useUserMode();
  const { user } = useAuth();
  const { settings, updateSettings } = useSettings();
  const { propertyId } = usePropertyContext();
  const [newRule, setNewRule] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const [profileName, setProfileName] = useState(user?.name || "");
  const [profileEmail, setProfileEmail] = useState(user?.email || "");
  const [profilePhone, setProfilePhone] = useState("");

  useEffect(() => {
    setProfileName(user?.name || "");
    setProfileEmail(user?.email || "");
  }, [user?.name, user?.email]);

  useEffect(() => {
    if (!propertyId) return;
    (async () => {
      const { data } = await supabase
        .from("settings")
        .select("phone")
        .eq("property_id", propertyId)
        .maybeSingle();
      if (data?.phone) setProfilePhone(data.phone);
    })();
  }, [propertyId]);

  const tabs = mode === "owner" ? allTabs : allTabs.filter((tab) => !tab.ownerOnly);

  const isOwner = mode === "owner";
  const userName = profileName || user?.name || "User";
  const userEmail = profileEmail || user?.email || "";
  const userRole = isOwner ? t("mode.propertyManager") : t("mode.tenant");
  const userInitials = userName.split(" ").map((n) => n[0]).join("");

  const showSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await supabase.auth.updateUser({
        data: { name: profileName.trim(), phone: profilePhone.trim() },
      });

      if (propertyId && profilePhone.trim()) {
        const { data: existing } = await supabase
          .from("settings")
          .select("id")
          .eq("property_id", propertyId)
          .maybeSingle();

        if (existing) {
          await supabase.from("settings").update({ phone: profilePhone.trim() }).eq("id", existing.id);
        } else {
          await supabase.from("settings").insert({ property_id: propertyId, phone: profilePhone.trim() });
        }
      }

      showSaved();
    } finally {
      setSaving(false);
    }
  };

  const addRule = () => {
    if (!newRule.trim()) return;
    updateSettings({ pgRules: [...settings.pgRules, newRule.trim()] });
    setNewRule("");
    showSaved();
  };

  const removeRule = (index: number) => {
    updateSettings({ pgRules: settings.pgRules.filter((_, i) => i !== index) });
    showSaved();
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t("settings.title")}</h2>
          <p className="text-sm text-slate-500 mt-1">{t("settings.subtitle")}</p>
        </div>
        {saved && (
          <span className="text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg animate-in fade-in">
            Settings saved
          </span>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-56 flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-blue-50 text-blue-700 shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon size={16} />
                {tab.key.startsWith("settings.") ? t(tab.key) : tab.key}
              </button>
            );
          })}
        </div>

        <Card className="flex-1">
          <Card.Content className="p-6">
            {activeTab === "profile" && (
              <div className="space-y-6">
                <h3 className="text-base font-semibold text-slate-900">{t("settings.profileSettings")}</h3>
                <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
                  <Avatar size="lg">
                    <AvatarFallback>{userInitials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{userName}</p>
                    <p className="text-xs text-slate-500">{userRole}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">{t("settings.fullName")}</label>
                    <input
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">{t("settings.email")}</label>
                    <input
                      type="email"
                      value={profileEmail}
                      disabled
                      className="w-full px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">{t("settings.phone")}</label>
                    <input
                      type="tel"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">{t("settings.role")}</label>
                    <input type="text" value={userRole} disabled className="w-full px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-500" />
                  </div>
                </div>
                <Button variant="primary" size="sm" onClick={handleSaveProfile} isDisabled={saving}>
                  {saving ? "Saving..." : t("common.save")}
                </Button>
              </div>
            )}

            {activeTab === "security" && (
              <div className="space-y-6">
                <h3 className="text-base font-semibold text-slate-900">{t("settings.securitySettings")}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">{t("settings.currentPassword")}</label>
                    <input type="password" placeholder={t("settings.currentPassword")} className="w-full max-w-sm px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">{t("settings.newPassword")}</label>
                    <input type="password" placeholder={t("settings.newPassword")} className="w-full max-w-sm px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                  </div>
                  <Button variant="primary" size="sm">{t("settings.updatePassword")}</Button>
                </div>
                <div className="pt-4 border-t border-slate-100">
                  <h4 className="text-sm font-medium text-slate-800 mb-2">{t("settings.twoFactor")}</h4>
                  <p className="text-xs text-slate-500 mb-3">{t("settings.twoFactorDesc")}</p>
                  <Button variant="outline" size="sm">{t("settings.enable2FA")}</Button>
                </div>
                <Button variant="primary" size="sm" onClick={showSaved}>{t("common.save")}</Button>
              </div>
            )}

            {activeTab === "pgRules" && (
              <div className="space-y-6">
                <h3 className="text-base font-semibold text-slate-900">PG Rules & Configuration</h3>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">UPI ID for Rent Collection</label>
                  <input
                    type="text"
                    value={settings.upiId}
                    onChange={(e) => { updateSettings({ upiId: e.target.value }); showSaved(); }}
                    placeholder="yourname@upi"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Tenants will use this to pay rent via UPI apps</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Late Fee Grace Period</label>
                    <select
                      value={settings.lateFeeGraceDays}
                      onChange={(e) => { updateSettings({ lateFeeGraceDays: Number(e.target.value) }); showSaved(); }}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      {[3, 5, 7, 10, 15].map((d) => (
                        <option key={d} value={d}>{d} days</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Late Fee Amount (₹)</label>
                    <input
                      type="number"
                      value={settings.lateFeeAmount}
                      onChange={(e) => { updateSettings({ lateFeeAmount: Number(e.target.value) }); showSaved(); }}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Notice Period (Days)</label>
                    <input
                      type="number"
                      value={settings.noticePeriodDays}
                      onChange={(e) => { updateSettings({ noticePeriodDays: Number(e.target.value) }); showSaved(); }}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Security Deposit (x Monthly Rent)</label>
                    <select
                      value={settings.depositMultiplier}
                      onChange={(e) => { updateSettings({ depositMultiplier: Number(e.target.value) }); showSaved(); }}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      {[1, 2, 3].map((m) => (
                        <option key={m} value={m}>{m} month{m > 1 ? "s" : ""}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-slate-800">PG Rules</h4>
                    <span className="text-[11px] text-slate-400">{settings.pgRules.length} rules</span>
                  </div>
                  <div className="space-y-2 mb-4">
                    {settings.pgRules.map((rule, i) => (
                      <div key={i} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg group">
                        <GripVertical size={14} className="text-slate-300" />
                        <span className="text-sm text-slate-700 flex-1">{rule}</span>
                        <button
                          onClick={() => removeRule(i)}
                          className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newRule}
                      onChange={(e) => setNewRule(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") addRule(); }}
                      placeholder="Add a new rule..."
                      className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    <Button variant="primary" size="sm" onClick={addRule}>
                      <Plus size={14} />
                      Add
                    </Button>
                  </div>
                </div>
                <Button variant="primary" size="sm" onClick={() => { updateSettings({}); showSaved(); }}>{t("common.save")}</Button>
              </div>
            )}


          </Card.Content>
        </Card>
      </div>
    </div>
  );
}
