"use client";

import { useState, useMemo } from "react";
import { X, ArrowRight } from "lucide-react";
import { Button } from "@heroui/react";
import { useBeds } from "@/lib/BedContext";

interface Props {
  bedId: string;
  tenantId: string;
  tenantName: string;
  onClose: () => void;
}

export default function BedTransferModal({ bedId, tenantId, tenantName, onClose }: Props) {
  const { beds, transferBed } = useBeds();
  const [selectedBed, setSelectedBed] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const currentBed = beds.find((b) => b.id === bedId);

  const availableBeds = useMemo(() => {
    return beds.filter((b) => b.id !== bedId && b.status === "available");
  }, [beds, bedId]);

  const handleTransfer = () => {
    if (!selectedBed || !reason.trim()) return;
    transferBed(bedId, selectedBed, tenantId, tenantName, reason.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Transfer Bed</h3>
            <p className="text-xs text-slate-500 mt-0.5">Move {tenantName} to a different bed</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={16} className="text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Current Assignment */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-[11px] text-slate-500 uppercase font-medium mb-1">Current</p>
            <p className="text-sm font-medium text-slate-800">
              Bed {currentBed?.label} · Room {currentBed?.roomId}
            </p>
          </div>

          <div className="flex justify-center">
            <ArrowRight size={16} className="text-slate-300" />
          </div>

          {/* Target Bed */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">Transfer to</label>
            {availableBeds.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4 bg-slate-50 rounded-lg">No available beds</p>
            ) : (
              <div className="grid gap-2 max-h-48 overflow-y-auto">
                {availableBeds.map((bed) => (
                  <button
                    key={bed.id}
                    onClick={() => setSelectedBed(bed.id)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      selectedBed === bed.id
                        ? "bg-blue-50 border-blue-200 shadow-sm"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <p className="text-sm font-medium text-slate-800">Bed {bed.label}</p>
                    <p className="text-[11px] text-slate-500">Room {bed.roomId}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Reason for transfer</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Tenant requested room change, maintenance issue..."
              rows={3}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <Button variant="ghost" size="sm" onPress={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" onPress={handleTransfer} isDisabled={!selectedBed || !reason.trim()}>
            Transfer
          </Button>
        </div>
      </div>
    </div>
  );
}
