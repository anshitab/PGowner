"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "./supabase";
import { usePropertyContext } from "./PropertyContext";
import { logActivity } from "./activity-logger";

export interface Bed {
  id: string;
  roomId: string;
  label: string;
  tenantId: string | null;
  tenantName: string | null;
  status: "occupied" | "available" | "maintenance" | "reserved";
  assignedDate: string | null;
}

export interface BedTransfer {
  id: string;
  tenantId: string;
  tenantName: string;
  fromBedId: string;
  toBedId: string;
  fromRoomId: string;
  toRoomId: string;
  reason: string;
  date: string;
  status: "completed";
}

interface BedContextType {
  beds: Bed[];
  transfers: BedTransfer[];
  loading: boolean;
  assignBed: (bedId: string, tenantId: string, tenantName: string, authUserId?: string | null) => Promise<void>;
  unassignBed: (bedId: string) => Promise<void>;
  transferBed: (fromBedId: string, toBedId: string, tenantId: string, tenantName: string, reason: string, authUserId?: string | null) => Promise<void>;
  updateBedStatus: (bedId: string, status: Bed["status"]) => Promise<void>;
  getBedsForRoom: (roomId: string) => Bed[];
  refetch: () => Promise<void>;
}

const BedContext = createContext<BedContextType>({
  beds: [],
  transfers: [],
  loading: true,
  assignBed: async () => {},
  unassignBed: async () => {},
  transferBed: async () => {},
  updateBedStatus: async () => {},
  getBedsForRoom: () => [],
  refetch: async () => {},
});

export function BedProvider({ children }: { children: ReactNode }) {
  const { propertyId } = usePropertyContext();
  const [beds, setBeds] = useState<Bed[]>([]);
  const [transfers, setTransfers] = useState<BedTransfer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBeds = useCallback(async () => {
    if (!propertyId) {
      setBeds([]);
      setTransfers([]);
      setLoading(false);
      return;
    }

    const [bedsRes, transfersRes] = await Promise.all([
      supabase.from("beds").select("*").eq("property_id", propertyId),
      supabase.from("bed_transfers").select("*").eq("property_id", propertyId).order("created_at", { ascending: false }),
    ]);

    if (bedsRes.data) {
      setBeds(bedsRes.data.map((b) => ({
        id: b.id,
        roomId: b.room_id,
        label: b.label,
        tenantId: b.tenant_id,
        tenantName: b.tenant_name,
        status: b.status as Bed["status"],
        assignedDate: b.assigned_date,
      })));
    }

    if (transfersRes.data) {
      setTransfers(transfersRes.data.map((t) => ({
        id: t.id,
        tenantId: t.tenant_id,
        tenantName: t.tenant_name,
        fromBedId: t.from_bed_id,
        toBedId: t.to_bed_id,
        fromRoomId: t.from_room_id,
        toRoomId: t.to_room_id,
        reason: t.reason,
        date: t.date,
        status: "completed" as const,
      })));
    }

    setLoading(false);
  }, [propertyId]);

  useEffect(() => {
    fetchBeds();
  }, [fetchBeds]);

  const assignBed = useCallback(async (bedId: string, tenantId: string, tenantName: string, authUserId?: string | null) => {
    const today = new Date().toISOString().split("T")[0];
    const bed = beds.find((b) => b.id === bedId);

    const bedUpdate: Record<string, unknown> = { tenant_name: tenantName, status: "occupied", assigned_date: today };
    if (authUserId) bedUpdate.tenant_id = authUserId;
    await supabase.from("beds").update(bedUpdate).eq("id", bedId);

    if (bed) {
      await supabase.from("tenants").update({ room_id: bed.roomId }).eq("id", tenantId);
      await supabase.from("rooms").update({ status: "Occupied" }).eq("id", bed.roomId);
    }

    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("rooms-updated"));

    setBeds((prev) =>
      prev.map((b) =>
        b.id === bedId
          ? { ...b, tenantId: authUserId || tenantId, tenantName, status: "occupied" as const, assignedDate: today }
          : b
      )
    );

    logActivity({
      type: "bed_transfer",
      action: "assigned",
      title: "Bed Assigned",
      description: `${tenantName} assigned to Bed ${bed?.label || ""}`,
      entityId: bedId,
      entityType: "bed",
      actor: "Owner",
      propertyId: propertyId!,
    });
  }, [beds, propertyId]);

  const unassignBed = useCallback(async (bedId: string) => {
    const bed = beds.find((b) => b.id === bedId);

    await supabase
      .from("beds")
      .update({ tenant_id: null, tenant_name: null, status: "available", assigned_date: null })
      .eq("id", bedId);

    if (bed?.tenantId) {
      await supabase.from("tenants").update({ room_id: null }).eq("user_id", bed.tenantId);
    } else if (bed?.tenantName) {
      await supabase.from("tenants").update({ room_id: null }).eq("name", bed.tenantName).eq("room_id", bed.roomId);
    }

    setBeds((prev) =>
      prev.map((b) =>
        b.id === bedId
          ? { ...b, tenantId: null, tenantName: null, status: "available" as const, assignedDate: null }
          : b
      )
    );

    if (bed) {
      const { data: dbBeds } = await supabase
        .from("beds")
        .select("status")
        .eq("room_id", bed.roomId);
      const hasOccupied = dbBeds?.some((b) => b.status === "occupied") ?? false;
      await supabase.from("rooms").update({ status: hasOccupied ? "Occupied" : "Vacant" }).eq("id", bed.roomId);
      if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("rooms-updated"));
    }

    if (bed?.tenantName) {
      logActivity({
        type: "bed_transfer",
        action: "unassigned",
        title: "Bed Vacated",
        description: `${bed.tenantName} unassigned from Bed ${bed.label}`,
        entityId: bedId,
        entityType: "bed",
        actor: "Owner",
        propertyId: propertyId!,
      });
    }
  }, [beds, propertyId]);

  const transferBed = useCallback(async (fromBedId: string, toBedId: string, tenantId: string, tenantName: string, reason: string, authUserId?: string | null) => {
    const fromBed = beds.find((b) => b.id === fromBedId);
    const toBed = beds.find((b) => b.id === toBedId);
    if (!fromBed || !toBed || !propertyId) return;

    const today = new Date().toISOString().split("T")[0];

    const toBedUpdate: Record<string, unknown> = { tenant_name: tenantName, status: "occupied", assigned_date: today };
    if (authUserId) toBedUpdate.tenant_id = authUserId;

    // Look up actual tenants table record for bed_transfers FK and room_id sync
    const { data: tenantRecord } = await supabase
      .from("tenants")
      .select("id")
      .eq("property_id", propertyId)
      .eq("name", tenantName)
      .eq("status", "Active")
      .limit(1)
      .single();

    const tenantRecordId = tenantRecord?.id || tenantId;

    await Promise.all([
      supabase.from("beds").update({ tenant_id: null, tenant_name: null, status: "available", assigned_date: null }).eq("id", fromBedId),
      supabase.from("beds").update(toBedUpdate).eq("id", toBedId),
      supabase.from("bed_transfers").insert({
        property_id: propertyId,
        tenant_id: tenantRecordId,
        tenant_name: tenantName,
        from_bed_id: fromBedId,
        to_bed_id: toBedId,
        from_room_id: fromBed.roomId,
        to_room_id: toBed.roomId,
        reason,
        date: today,
      }),
      supabase.from("tenants").update({ room_id: toBed.roomId }).eq("id", tenantRecordId),
    ]);

    setBeds((prev) =>
      prev.map((b) => {
        if (b.id === fromBedId) return { ...b, tenantId: null, tenantName: null, status: "available" as const, assignedDate: null };
        if (b.id === toBedId) return { ...b, tenantId, tenantName, status: "occupied" as const, assignedDate: today };
        return b;
      })
    );

    setTransfers((prev) => [{
      id: crypto.randomUUID(),
      tenantId,
      tenantName,
      fromBedId,
      toBedId,
      fromRoomId: fromBed.roomId,
      toRoomId: toBed.roomId,
      reason,
      date: today,
      status: "completed" as const,
    }, ...prev]);

    if (fromBed.roomId !== toBed.roomId) {
      const { data: fromRoomBeds } = await supabase
        .from("beds")
        .select("status")
        .eq("room_id", fromBed.roomId);
      const fromHasOccupied = fromRoomBeds?.some((b) => b.status === "occupied") ?? false;
      await supabase.from("rooms").update({ status: fromHasOccupied ? "Occupied" : "Vacant" }).eq("id", fromBed.roomId);
      await supabase.from("rooms").update({ status: "Occupied" }).eq("id", toBed.roomId);
      if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("rooms-updated"));
    }

    logActivity({
      type: "bed_transfer",
      action: "transferred",
      title: "Bed Transfer",
      description: `${tenantName} transferred from Bed ${fromBed.label} to Bed ${toBed.label}. Reason: ${reason}`,
      entityId: toBedId,
      entityType: "bed",
      actor: "Owner",
      propertyId: propertyId,
    });
  }, [beds, propertyId]);

  const updateBedStatus = useCallback(async (bedId: string, status: Bed["status"]) => {
    await supabase.from("beds").update({ status }).eq("id", bedId);
    setBeds((prev) => prev.map((b) => (b.id === bedId ? { ...b, status } : b)));
  }, []);

  const getBedsForRoom = useCallback((roomId: string) => {
    return beds.filter((b) => b.roomId === roomId);
  }, [beds]);

  return (
    <BedContext.Provider value={{ beds, transfers, loading, assignBed, unassignBed, transferBed, updateBedStatus, getBedsForRoom, refetch: fetchBeds }}>
      {children}
    </BedContext.Provider>
  );
}

export const useBeds = () => useContext(BedContext);
