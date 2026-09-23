"use client";

import { User, Shield, ScrollText, Plus, Trash2, GripVertical, Eye, EyeOff, UtensilsCrossed, Wrench } from "lucide-react";
import { useState, useEffect } from "react";
import { Card, Button, Avatar, AvatarFallback } from "@heroui/react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useUserMode } from "@/lib/UserModeContext";
import { useAuth } from "@/lib/AuthContext";
import { useSettings } from "@/lib/SettingsContext";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { DEMO_WEEKLY_MENU } from "@/lib/food-menu";
import ServiceVendorsPanel from "@/components/settings/ServiceVendorsPanel";
const allTabs = [
  { id: "profile", key: "settings.profile", icon: User },
  { id: "security", key: "settings.security", icon: Shield },
  { id: "food", key: "settings.food", icon: UtensilsCrossed, ownerOnly: true },
  { id: "serviceContacts", key: "settings.serviceContacts", icon: Wrench, ownerOnly: true },
  { id: "pgRules", key: "PG Rules", icon: ScrollText, ownerOnly: true },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const router = useRouter();
  const { t } = useLanguage();
  const { mode } = useUserMode();
  const { user, refreshUser } = useAuth();
  const { settings, updateSettings } = useSettings();
  const [newRule, setNewRule] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const [profileName, setProfileName] = useState(user?.name || "");
  const [profileEmail, setProfileEmail] = useState(user?.email || "");
  const [profilePhone, setProfilePhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    setProfileName(user?.name || "");
    setProfileEmail(user?.email || "");
    if (user?.phone) setProfilePhone(user.phone);
  }, [user?.name, user?.email, user?.phone]);

  // Load phone from auth metadata, and for tenants also from tenants table
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      const metaPhone = (authData.user?.user_metadata?.phone as string) || "";
      if (metaPhone) setProfilePhone(metaPhone);

      if (user.role === "tenant") {
        let query = supabase.from("tenants").select("phone, name").eq("user_id", user.id);
        const { data: byUser } = await query.maybeSingle();
        if (byUser) {
          if (byUser.phone) setProfilePhone(byUser.phone);
          if (byUser.name && !profileName) setProfileName(byUser.name);
          return;
        }
        if (user.email) {
          const { data: byEmail } = await supabase
            .from("tenants")
            .select("phone, name")
            .eq("email", user.email)
            .maybeSingle();
          if (byEmail?.phone) setProfilePhone(byEmail.phone);
          if (byEmail?.name && !profileName) setProfileName(byEmail.name);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role, user?.email]);

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
    if (!user) {
      toast.error("You must be signed in");
      return;
    }
    if (!profileName.trim()) {
      toast.error("Name is required");
      return;
    }

    setSaving(true);
    try {
      const { data: updated, error } = await supabase.auth.updateUser({
        data: {
          name: profileName.trim(),
          phone: profilePhone.trim(),
        },
      });

      if (error) {
        toast.error(error.message || "Failed to update profile");
        return;
      }

      // Keep tenant directory in sync
      if (user.role === "tenant") {
        const patch = {
          name: profileName.trim(),
          phone: profilePhone.trim(),
        };
        const { data: linked } = await supabase
          .from("tenants")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (linked?.id) {
          const { error: tenantErr } = await supabase.from("tenants").update(patch).eq("id", linked.id);
          if (tenantErr) {
            toast.error(tenantErr.message || "Profile saved, but tenant record failed to update");
            await refreshUser();
            return;
          }
        } else if (user.email) {
          await supabase.from("tenants").update(patch).eq("email", user.email);
        }
      }

      if (updated.user) {
        setProfileName(updated.user.user_metadata?.name || profileName.trim());
        setProfilePhone(updated.user.user_metadata?.phone || profilePhone.trim());
      }

      await refreshUser();
      showSaved();
      toast.success("Profile updated successfully");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!user?.email) {
      toast.error("You must be signed in to update your password");
      return;
    }
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match");
      return;
    }
    if (currentPassword === newPassword) {
      toast.error("New password must be different from the current password");
      return;
    }

    setUpdatingPassword(true);
    try {
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (verifyError) {
        toast.error("Current password is incorrect");
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        toast.error(error.message || "Failed to update password");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated successfully");
    } catch {
      toast.error("Failed to update password");
    } finally {
      setUpdatingPassword(false);
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
                <Button variant="primary" size="sm" onPress={handleSaveProfile} isDisabled={saving}>
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
                    <div className="relative max-w-sm">
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder={t("settings.currentPassword")}
                        autoComplete="current-password"
                        className="w-full px-3 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                      >
                        {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">{t("settings.newPassword")}</label>
                    <div className="relative max-w-sm">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder={t("settings.newPassword")}
                        autoComplete="new-password"
                        className="w-full px-3 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        aria-label={showNewPassword ? "Hide password" : "Show password"}
                      >
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Confirm New Password</label>
                    <div className="relative max-w-sm">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        autoComplete="new-password"
                        className="w-full px-3 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onPress={handleUpdatePassword}
                    isDisabled={updatingPassword}
                  >
                    {updatingPassword ? "Updating..." : t("settings.updatePassword")}
                  </Button>
                </div>
                <div className="pt-4 border-t border-slate-100">
                  <h4 className="text-sm font-medium text-slate-800 mb-2">{t("settings.twoFactor")}</h4>
                  <p className="text-xs text-slate-500 mb-3">{t("settings.twoFactorDesc")}</p>
                  <Button variant="outline" size="sm">{t("settings.enable2FA")}</Button>
                </div>
              </div>
            )}

            {activeTab === "food" && isOwner && (
              <div className="space-y-6">
                <h3 className="text-base font-semibold text-slate-900">{t("settings.foodTitle")}</h3>
                <p className="text-sm text-slate-500">{t("settings.foodDesc")}</p>

                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/80 p-4">
                  <input
                    type="checkbox"
                    checked={settings.foodIncluded}
                    onChange={(e) => {
                      const foodIncluded = e.target.checked;
                      const hasMenu = Object.values(settings.weeklyMenu).some(
                        (d) => d.breakfast || d.lunch || d.dinner
                      );
                      void updateSettings({
                        foodIncluded,
                        weeklyMenu: foodIncluded && !hasMenu ? DEMO_WEEKLY_MENU : settings.weeklyMenu,
                      }).then(() => showSaved());
                    }}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-[var(--teal)] focus:ring-[var(--teal)]"
                  />
                  <span>
                    <span className="block text-sm font-medium text-slate-900">{t("settings.foodIncluded")}</span>
                    <span className="mt-1 block text-xs text-slate-500">{t("settings.foodIncludedHint")}</span>
                  </span>
                </label>

                {settings.foodIncluded && (
                  <Button variant="primary" size="sm" onPress={() => router.push("/food-menu")}>
                    <UtensilsCrossed size={14} />
                    {t("settings.manageFoodMenu")}
                  </Button>
                )}
              </div>
            )}

            {activeTab === "serviceContacts" && isOwner && (
              <ServiceVendorsPanel />
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
