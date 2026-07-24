"use client";

import { useState, useMemo } from "react";
import { X, Calendar, IndianRupee, CheckCircle2, Plus, Trash2, AlertTriangle } from "lucide-react";
import { Button, Chip } from "@heroui/react";
import { useCheckout } from "@/lib/CheckoutContext";
import { useBeds } from "@/lib/BedContext";
import { useSettings } from "@/lib/SettingsContext";

interface TenantInfo {
  id: string;
  name: string;
  room: string;
  joinDate: string;
  rent: string;
  deposit: string;
}

interface Props {
  tenant: TenantInfo;
  onClose: () => void;
  onComplete: () => void;
}

interface Deduction {
  id: string;
  reason: string;
  amount: number;
}

export default function CheckoutWizard({ tenant, onClose, onComplete }: Props) {
  const { initiateCheckout, completeCheckout } = useCheckout();
  const { beds, unassignBed } = useBeds();
  const { settings } = useSettings();
  const [step, setStep] = useState(1);

  // Step 1 state
  const [lastDate, setLastDate] = useState(new Date().toISOString().split("T")[0]);
  const [noticeServed, setNoticeServed] = useState(true);
  const [noticeDate, setNoticeDate] = useState("");

  // Step 2 state
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [newReason, setNewReason] = useState("");
  const [newAmount, setNewAmount] = useState("");

  const rentNum = parseInt(tenant.rent.replace(/[₹,]/g, "")) || 0;
  const depositNum = parseInt(tenant.deposit.replace(/[₹,]/g, "")) || 0;

  const tenantBed = beds.find((b) => b.tenantName === tenant.name && b.status === "occupied");

  const noticePenalty = useMemo(() => {
    if (noticeServed) return 0;
    const daysShort = settings.noticePeriodDays;
    return daysShort * settings.checkoutDeductions.noticePenaltyPerDay;
  }, [noticeServed, settings]);

  const cleaningFee = settings.checkoutDeductions.cleaningFee;

  const totalDeductions = useMemo(() => {
    const custom = deductions.reduce((sum, d) => sum + d.amount, 0);
    return custom + noticePenalty + cleaningFee;
  }, [deductions, noticePenalty, cleaningFee]);

  const refundAmount = Math.max(0, depositNum - totalDeductions);

  const addDeduction = () => {
    if (!newReason.trim() || !newAmount) return;
    setDeductions([...deductions, { id: crypto.randomUUID(), reason: newReason.trim(), amount: Number(newAmount) }]);
    setNewReason("");
    setNewAmount("");
  };

  const removeDeduction = (id: string) => {
    setDeductions(deductions.filter((d) => d.id !== id));
  };

  const handleComplete = async () => {
    const record = await initiateCheckout({
      tenantId: tenant.id,
      tenantName: tenant.name,
      roomNumber: tenant.room,
      bedLabel: tenantBed?.label || "",
      checkInDate: tenant.joinDate,
      depositAmount: depositNum,
      pendingRent: 0,
      deductions: deductions.map((d) => ({ id: d.id, reason: d.reason, amount: d.amount, notes: "" })),
      totalDeductions,
      refundAmount,
      noticePeriodServed: noticeServed,
      noticeDate: noticeDate || null,
      lastDate,
      notes: "",
    });
    if (record) {
      await completeCheckout(record.id);
    }
    if (tenantBed) {
      await unassignBed(tenantBed.id);
    }
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Tenant Checkout</h3>
            <p className="text-xs text-slate-500 mt-0.5">{tenant.name} · {tenant.room}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={16} className="text-slate-500" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-3 border-b border-slate-50 flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step > s ? "bg-emerald-100 text-emerald-700" :
                step === s ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"
              }`}>
                {step > s ? <CheckCircle2 size={13} /> : s}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${step === s ? "text-slate-800" : "text-slate-400"}`}>
                {s === 1 ? "Details" : s === 2 ? "Deductions" : "Confirm"}
              </span>
              {s < 3 && <div className={`flex-1 h-0.5 rounded ${step > s ? "bg-emerald-200" : "bg-slate-100"}`} />}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <div className="space-y-5">
              <div className="p-4 bg-slate-50 rounded-xl space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Tenant</span>
                  <span className="font-medium text-slate-800">{tenant.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Room</span>
                  <span className="font-medium text-slate-800">{tenant.room}</span>
                </div>
                {tenantBed && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Bed</span>
                    <span className="font-medium text-slate-800">{tenantBed.label}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Check-in Date</span>
                  <span className="font-medium text-slate-800">
                    {new Date(tenant.joinDate).toLocaleDateString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Security Deposit</span>
                  <span className="font-medium text-slate-800">{tenant.deposit}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  <Calendar size={12} className="inline mr-1" />
                  Last Date of Stay
                </label>
                <input
                  type="date"
                  value={lastDate}
                  onChange={(e) => setLastDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-slate-700">Notice period served?</p>
                  <p className="text-[11px] text-slate-500">Required: {settings.noticePeriodDays} days</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setNoticeServed(true)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      noticeServed ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-white border border-slate-200 text-slate-600"
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setNoticeServed(false)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      !noticeServed ? "bg-red-100 text-red-700 border border-red-200" : "bg-white border border-slate-200 text-slate-600"
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>

              {!noticeServed && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                  <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-700">
                    Penalty of ₹{noticePenalty.toLocaleString("en-IN")} will be applied ({settings.noticePeriodDays} days × ₹{settings.checkoutDeductions.noticePenaltyPerDay}/day)
                  </p>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h4 className="text-sm font-semibold text-slate-800">Deposit Deductions</h4>

              {/* Auto deductions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm text-slate-600">Cleaning Fee</span>
                  <span className="text-sm font-medium text-slate-800">₹{cleaningFee.toLocaleString("en-IN")}</span>
                </div>
                {!noticeServed && (
                  <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100">
                    <span className="text-sm text-amber-700">Notice Period Penalty</span>
                    <span className="text-sm font-medium text-amber-800">₹{noticePenalty.toLocaleString("en-IN")}</span>
                  </div>
                )}
              </div>

              {/* Custom deductions */}
              {deductions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-500 uppercase">Custom Deductions</p>
                  {deductions.map((d) => (
                    <div key={d.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg group">
                      <span className="text-sm text-slate-600">{d.reason}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-800">₹{d.amount.toLocaleString("en-IN")}</span>
                        <button onClick={() => removeDeduction(d.id)} className="p-1 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add deduction */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  placeholder="Deduction reason"
                  className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <input
                  type="number"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder="₹ Amount"
                  className="w-28 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <Button variant="outline" size="sm" onClick={addDeduction}>
                  <Plus size={14} />
                </Button>
              </div>

              {/* Summary */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Security Deposit</span>
                  <span className="font-medium text-slate-800">₹{depositNum.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Total Deductions</span>
                  <span className="font-medium text-red-600">- ₹{totalDeductions.toLocaleString("en-IN")}</span>
                </div>
                <div className="border-t border-blue-200 pt-2 flex justify-between">
                  <span className="text-sm font-semibold text-slate-800">Refund Amount</span>
                  <span className="text-lg font-bold text-emerald-600">₹{refundAmount.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <h4 className="text-sm font-semibold text-slate-800">Confirm Checkout</h4>

              <div className="p-4 bg-slate-50 rounded-xl space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Tenant</span>
                  <span className="font-medium">{tenant.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Room / Bed</span>
                  <span className="font-medium">{tenant.room} / {tenantBed?.label || "-"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Last Date</span>
                  <span className="font-medium">{new Date(lastDate).toLocaleDateString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Notice Served</span>
                  <Chip size="sm" variant="soft" color={noticeServed ? "success" : "danger"}>
                    {noticeServed ? "Yes" : "No"}
                  </Chip>
                </div>
              </div>

              <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Refund to Tenant</p>
                    <p className="text-[11px] text-slate-500">Deposit ₹{depositNum.toLocaleString("en-IN")} - Deductions ₹{totalDeductions.toLocaleString("en-IN")}</p>
                  </div>
                  <span className="text-2xl font-bold text-emerald-700">₹{refundAmount.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700">
                  This action will free the bed and mark the tenant as checked out. This cannot be undone.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
          {step > 1 ? (
            <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)}>Back</Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          )}
          {step < 3 ? (
            <Button variant="primary" size="sm" onClick={() => setStep(step + 1)}>
              Continue
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={handleComplete}>
              <CheckCircle2 size={14} />
              Complete Checkout
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
