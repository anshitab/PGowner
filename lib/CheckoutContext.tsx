"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "./supabase";
import { usePropertyContext } from "./PropertyContext";
import { logActivity } from "./activity-logger";

export interface DepositDeduction {
  id: string;
  reason: string;
  amount: number;
  notes: string;
}

export interface CheckoutRecord {
  id: string;
  tenantId: string;
  tenantName: string;
  roomNumber: string;
  bedLabel: string;
  initiatedDate: string;
  completedDate: string | null;
  status: "initiated" | "settlement_pending" | "completed" | "cancelled";
  checkInDate: string;
  depositAmount: number;
  pendingRent: number;
  deductions: DepositDeduction[];
  totalDeductions: number;
  refundAmount: number;
  noticePeriodServed: boolean;
  noticeDate: string | null;
  lastDate: string;
  notes: string;
}

interface CheckoutContextType {
  records: CheckoutRecord[];
  loading: boolean;
  initiateCheckout: (record: Omit<CheckoutRecord, "id" | "initiatedDate" | "completedDate" | "status">) => Promise<CheckoutRecord | null>;
  completeCheckout: (id: string) => Promise<void>;
  cancelCheckout: (id: string) => Promise<void>;
  updateCheckout: (id: string, updates: Partial<CheckoutRecord>) => Promise<void>;
  getCheckoutForTenant: (tenantId: string) => CheckoutRecord | undefined;
}

const CheckoutContext = createContext<CheckoutContextType>({
  records: [],
  loading: true,
  initiateCheckout: async () => null,
  completeCheckout: async () => {},
  cancelCheckout: async () => {},
  updateCheckout: async () => {},
  getCheckoutForTenant: () => undefined,
});

export function CheckoutProvider({ children }: { children: ReactNode }) {
  const { propertyId } = usePropertyContext();
  const [records, setRecords] = useState<CheckoutRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!propertyId) {
      setRecords([]);
      setLoading(false);
      return;
    }

    (async () => {
      const { data } = await supabase
        .from("checkout_records")
        .select("*")
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false });

      if (data) {
        setRecords(data.map((r) => ({
          id: r.id,
          tenantId: r.tenant_id,
          tenantName: r.tenant_name,
          roomNumber: r.room_number,
          bedLabel: r.bed_label || "",
          initiatedDate: r.initiated_date || "",
          completedDate: r.completed_date,
          status: r.status as CheckoutRecord["status"],
          checkInDate: r.check_in_date || "",
          depositAmount: r.deposit_amount || 0,
          pendingRent: r.pending_rent || 0,
          deductions: (r.deductions as DepositDeduction[]) || [],
          totalDeductions: r.total_deductions || 0,
          refundAmount: r.refund_amount || 0,
          noticePeriodServed: r.notice_period_served || false,
          noticeDate: r.notice_date,
          lastDate: r.last_date || "",
          notes: r.notes || "",
        })));
      }
      setLoading(false);
    })();
  }, [propertyId]);

  const initiateCheckout = useCallback(async (data: Omit<CheckoutRecord, "id" | "initiatedDate" | "completedDate" | "status">) => {
    if (!propertyId) return null;

    const today = new Date().toISOString().split("T")[0];

    const { data: row, error } = await supabase
      .from("checkout_records")
      .insert({
        property_id: propertyId,
        tenant_id: data.tenantId,
        tenant_name: data.tenantName,
        room_number: data.roomNumber,
        bed_label: data.bedLabel,
        status: "settlement_pending",
        check_in_date: data.checkInDate,
        deposit_amount: data.depositAmount,
        pending_rent: data.pendingRent,
        deductions: data.deductions,
        total_deductions: data.totalDeductions,
        refund_amount: data.refundAmount,
        notice_period_served: data.noticePeriodServed,
        notice_date: data.noticeDate,
        last_date: data.lastDate,
        notes: data.notes,
        initiated_date: today,
      })
      .select()
      .single();

    if (error || !row) return null;

    const record: CheckoutRecord = {
      id: row.id,
      tenantId: data.tenantId,
      tenantName: data.tenantName,
      roomNumber: data.roomNumber,
      bedLabel: data.bedLabel,
      initiatedDate: today,
      completedDate: null,
      status: "settlement_pending",
      checkInDate: data.checkInDate,
      depositAmount: data.depositAmount,
      pendingRent: data.pendingRent,
      deductions: data.deductions,
      totalDeductions: data.totalDeductions,
      refundAmount: data.refundAmount,
      noticePeriodServed: data.noticePeriodServed,
      noticeDate: data.noticeDate,
      lastDate: data.lastDate,
      notes: data.notes,
    };

    setRecords((prev) => [record, ...prev]);

    logActivity({
      type: "checkout",
      action: "initiated",
      title: "Checkout Initiated",
      description: `Checkout initiated for ${data.tenantName} from Room ${data.roomNumber}`,
      entityId: data.tenantId,
      entityType: "tenant",
      actor: "Owner",
      propertyId,
    });

    return record;
  }, [propertyId]);

  const completeCheckout = useCallback(async (id: string) => {
    const today = new Date().toISOString().split("T")[0];
    const record = records.find((r) => r.id === id);

    await supabase
      .from("checkout_records")
      .update({ status: "completed", completed_date: today })
      .eq("id", id);

    if (record) {
      await supabase
        .from("tenants")
        .update({ room_id: null, status: "Inactive" })
        .eq("id", record.tenantId);
    }

    setRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "completed" as const, completedDate: today } : r))
    );

    if (record && propertyId) {
      logActivity({
        type: "checkout",
        action: "completed",
        title: "Checkout Completed",
        description: `${record.tenantName} checked out from Room ${record.roomNumber}. Refund: ₹${record.refundAmount.toLocaleString("en-IN")}`,
        entityId: record.tenantId,
        entityType: "tenant",
        actor: "Owner",
        propertyId,
      });
    }
  }, [records, propertyId]);

  const cancelCheckout = useCallback(async (id: string) => {
    await supabase.from("checkout_records").update({ status: "cancelled" }).eq("id", id);
    setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, status: "cancelled" as const } : r)));
  }, []);

  const updateCheckout = useCallback(async (id: string, updates: Partial<CheckoutRecord>) => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.deductions !== undefined) dbUpdates.deductions = updates.deductions;
    if (updates.totalDeductions !== undefined) dbUpdates.total_deductions = updates.totalDeductions;
    if (updates.refundAmount !== undefined) dbUpdates.refund_amount = updates.refundAmount;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.status !== undefined) dbUpdates.status = updates.status;

    if (Object.keys(dbUpdates).length > 0) {
      await supabase.from("checkout_records").update(dbUpdates).eq("id", id);
    }

    setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  }, []);

  const getCheckoutForTenant = useCallback(
    (tenantId: string) => records.find((r) => r.tenantId === tenantId && r.status !== "cancelled" && r.status !== "completed"),
    [records]
  );

  return (
    <CheckoutContext.Provider value={{ records, loading, initiateCheckout, completeCheckout, cancelCheckout, updateCheckout, getCheckoutForTenant }}>
      {children}
    </CheckoutContext.Provider>
  );
}

export const useCheckout = () => useContext(CheckoutContext);
