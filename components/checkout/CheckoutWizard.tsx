"use client";

import { useState } from "react";
import { X, Calendar, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@heroui/react";
import { useCheckout } from "@/lib/CheckoutContext";
import { useBeds } from "@/lib/BedContext";

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

export default function CheckoutWizard({ tenant, onClose, onComplete }: Props) {
  const { initiateCheckout, completeCheckout } = useCheckout();
  const { beds, unassignBed } = useBeds();
  const [step, setStep] = useState(1);

  // Step 1 state
  const [lastDate, setLastDate] = useState(new Date().toISOString().split("T")[0]);

  const depositNum = parseInt(tenant.deposit.replace(/[₹,]/g, "")) || 0;
  const tenantBed = beds.find((b) => b.tenantName === tenant.name && b.status === "occupied");

  const handleComplete = async () => {
    const record = await initiateCheckout({
      tenantId: tenant.id,
      tenantName: tenant.name,
      roomNumber: tenant.room,
      bedLabel: tenantBed?.label || "",
      checkInDate: tenant.joinDate,
      depositAmount: depositNum,
      pendingRent: 0,
      deductions: [],
      totalDeductions: 0,
      refundAmount: depositNum,
      noticePeriodServed: true,
      noticeDate: null,
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
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step > s ? "bg-emerald-100 text-emerald-700" :
                step === s ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"
              }`}>
                {step > s ? <CheckCircle2 size={13} /> : s}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${step === s ? "text-slate-800" : "text-slate-400"}`}>
                {s === 1 ? "Details" : "Confirm"}
              </span>
              {s < 2 && <div className={`flex-1 h-0.5 rounded ${step > s ? "bg-emerald-200" : "bg-slate-100"}`} />}
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


            </div>
          )}

          {step === 2 && (
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
              </div>

              <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Security Deposit Refund</p>
                  </div>
                  <span className="text-2xl font-bold text-emerald-700">₹{depositNum.toLocaleString("en-IN")}</span>
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
          {step < 2 ? (
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
