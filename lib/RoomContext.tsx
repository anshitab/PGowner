"use client";

import { createContext, useContext, useCallback, ReactNode } from "react";
import { supabase } from "./supabase";
import { usePropertyContext } from "./PropertyContext";
import { useBeds } from "./BedContext";
import { logActivity } from "./activity-logger";

interface RoomUpdates {
  number?: string;
  floor?: number;
  type?: string;
  rent?: number;
  amenities?: string[];
}

interface RoomContextType {
  updateRoom: (roomId: string, updates: RoomUpdates, description?: string) => Promise<void>;
  addBed: (roomId: string, label: string, roomNumber: string) => Promise<void>;
  removeBed: (bedId: string, bedLabel: string, roomNumber: string) => Promise<void>;
  syncRoomStatus: (roomId: string) => Promise<void>;
}

const RoomContext = createContext<RoomContextType>({
  updateRoom: async () => {},
  addBed: async () => {},
  removeBed: async () => {},
  syncRoomStatus: async () => {},
});

export function RoomProvider({ children }: { children: ReactNode }) {
  const { propertyId } = usePropertyContext();
  const { beds, refetch: refetchBeds } = useBeds();

  const syncRoomStatus = useCallback(async (roomId: string) => {
    const roomBeds = beds.filter((b) => b.roomId === roomId);
    const hasOccupied = roomBeds.some((b) => b.status === "occupied");
    await supabase
      .from("rooms")
      .update({ status: hasOccupied ? "Occupied" : "Vacant" })
      .eq("id", roomId);
  }, [beds]);

  const updateRoom = useCallback(async (roomId: string, updates: RoomUpdates, description?: string) => {
    if (!propertyId) return;

    const dbUpdates: Record<string, unknown> = {};
    if (updates.number !== undefined) dbUpdates.number = updates.number;
    if (updates.floor !== undefined) dbUpdates.floor = updates.floor;
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.rent !== undefined) dbUpdates.rent = updates.rent;
    if (updates.amenities !== undefined) dbUpdates.amenities = updates.amenities;

    await supabase.from("rooms").update(dbUpdates).eq("id", roomId);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("rooms-updated"));
    }

    logActivity({
      type: "room_edit",
      action: "updated",
      title: "Room Updated",
      description: description || "Room settings updated",
      entityId: roomId,
      entityType: "room",
      actor: "Owner",
      propertyId,
    });
  }, [propertyId]);

  const addBed = useCallback(async (roomId: string, label: string, roomNumber: string) => {
    if (!propertyId) return;

    await supabase.from("beds").insert({
      room_id: roomId,
      property_id: propertyId,
      label,
      status: "available",
    });

    await refetchBeds();

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("rooms-updated"));
    }

    logActivity({
      type: "room_edit",
      action: "bed_added",
      title: "Bed Added",
      description: `Bed ${label} added to Room ${roomNumber}`,
      entityId: roomId,
      entityType: "room",
      actor: "Owner",
      propertyId,
    });
  }, [propertyId, refetchBeds]);

  const removeBed = useCallback(async (bedId: string, bedLabel: string, roomNumber: string) => {
    if (!propertyId) return;

    const bed = beds.find((b) => b.id === bedId);
    if (bed && bed.status !== "available") {
      throw new Error("Cannot remove an occupied bed");
    }

    await supabase.from("beds").delete().eq("id", bedId);

    await refetchBeds();

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("rooms-updated"));
    }

    logActivity({
      type: "room_edit",
      action: "bed_removed",
      title: "Bed Removed",
      description: `Bed ${bedLabel} removed from Room ${roomNumber}`,
      entityId: bedId,
      entityType: "bed",
      actor: "Owner",
      propertyId,
    });
  }, [propertyId, beds, refetchBeds]);

  return (
    <RoomContext.Provider value={{ updateRoom, addBed, removeBed, syncRoomStatus }}>
      {children}
    </RoomContext.Provider>
  );
}

export const useRooms = () => useContext(RoomContext);
