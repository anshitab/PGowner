"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import { usePropertyContext } from "./PropertyContext";

export interface RoomData {
  id: string;
  number: string;
  floor: number;
  type: string;
  rent: number;
  status: string;
  amenities: string[];
  tenants: string[];
}

export interface BedData {
  id: string;
  roomId: string;
  label: string;
  tenantName: string | null;
  status: string;
}

export function usePGData() {
  const { property, propertyId, loading: propertyLoading } = usePropertyContext();
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [beds, setBeds] = useState<BedData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!propertyId) {
      setRooms([]);
      setBeds([]);
      setLoading(false);
      return;
    }

    const [roomsRes, bedsRes] = await Promise.all([
      supabase.from("rooms").select("*").eq("property_id", propertyId).order("floor").order("number"),
      supabase.from("beds").select("*").eq("property_id", propertyId),
    ]);

    if (roomsRes.data) {
      const bedsData = bedsRes.data || [];
      setRooms(
        roomsRes.data.map((r) => {
          const roomBeds = bedsData.filter((b) => b.room_id === r.id);
          const occupiedTenants = roomBeds
            .filter((b) => b.status === "occupied" && b.tenant_name)
            .map((b) => b.tenant_name!);
          return {
            id: r.id,
            number: r.number,
            floor: r.floor,
            type: r.type,
            rent: r.rent,
            status: occupiedTenants.length > 0 ? "Occupied" : "Vacant",
            amenities: r.amenities || [],
            tenants: occupiedTenants,
          };
        })
      );
    }

    if (bedsRes.data) {
      setBeds(
        bedsRes.data.map((b) => ({
          id: b.id,
          roomId: b.room_id,
          label: b.label,
          tenantName: b.tenant_name,
          status: b.status,
        }))
      );
    }

    setLoading(false);
  }, [propertyId]);

  useEffect(() => {
    if (!propertyLoading) {
      fetchData();
    }
  }, [propertyLoading, fetchData]);

  const amenities: Record<string, string[]> = {};
  rooms.forEach((r) => {
    amenities[r.id] = r.amenities;
  });

  return {
    rooms,
    beds,
    amenities,
    property: property ? { name: property.name, address: property.address, type: property.type } : null,
    totalFloors: property?.total_floors || 0,
    rules: property?.rules || [],
    loading: loading || propertyLoading,
    refetch: fetchData,
  };
}
