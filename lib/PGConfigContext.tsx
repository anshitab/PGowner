"use client";

import { createContext, useContext, ReactNode } from "react";
import { supabase } from "./supabase";
import { DEMO_WEEKLY_MENU, emptyWeeklyMenu } from "./food-menu";
import { usePropertyContext } from "./PropertyContext";
import { useAuth } from "./AuthContext";

export interface PGRoom {
  id: number;
  number: string;
  floor: number;
  type: "Single" | "Double" | "Triple";
  rent: string;
  amenities: string[];
}

export interface PGBed {
  id: number;
  roomId: number;
  label: string;
  tenantName: string | null;
  status: "occupied" | "available";
}

export interface PGConfig {
  property: { name: string; address: string; type: string };
  floors: number;
  rooms: PGRoom[];
  beds: PGBed[];
  rules: string[];
  setupComplete: boolean;
  foodIncluded?: boolean;
}

interface PGConfigContextType {
  config: PGConfig | null;
  setConfig: (config: PGConfig) => Promise<void>;
  isSetupComplete: boolean;
  resetConfig: () => Promise<void>;
}

const PGConfigContext = createContext<PGConfigContextType>({
  config: null,
  setConfig: async () => {},
  isSetupComplete: false,
  resetConfig: async () => {},
});

export function PGConfigProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { property, refetch: refetchProperty } = usePropertyContext();

  const isSetupComplete = !!property;

  const config: PGConfig | null = property
    ? {
        property: { name: property.name, address: property.address, type: property.type },
        floors: property.total_floors,
        rooms: [],
        beds: [],
        rules: property.rules || [],
        setupComplete: true,
      }
    : null;

  const setConfig = async (newConfig: PGConfig) => {
    if (!user) throw new Error("Not authenticated");

    const { data: prop, error: propError } = await supabase
      .from("properties")
      .insert({
        owner_id: user.id,
        name: newConfig.property.name,
        address: newConfig.property.address,
        type: newConfig.property.type,
        total_floors: newConfig.floors,
        total_rooms: newConfig.rooms.length,
        rules: newConfig.rules,
      })
      .select()
      .single();

    if (propError || !prop) {
      throw new Error(propError?.message || "Failed to create property");
    }

    localStorage.setItem("pgowner_selected_property_id", prop.id);

    for (const room of newConfig.rooms) {
      const { data: roomRow } = await supabase
        .from("rooms")
        .insert({
          property_id: prop.id,
          number: room.number,
          floor: room.floor,
          type: room.type,
          rent: parseInt(room.rent.replace(/[^\d]/g, "")) || 0,
          amenities: room.amenities,
        })
        .select()
        .single();

      if (roomRow) {
        const roomBeds = newConfig.beds.filter((b) => b.roomId === room.id);
        if (roomBeds.length > 0) {
          await supabase.from("beds").insert(
            roomBeds.map((b) => ({
              room_id: roomRow.id,
              property_id: prop.id,
              label: b.label,
              status: "available",
            }))
          );
        }
      }
    }

    // Create default settings
    const foodIncluded = !!newConfig.foodIncluded;
    await supabase.from("settings").insert({
      property_id: prop.id,
      food_included: foodIncluded,
      weekly_menu: foodIncluded ? DEMO_WEEKLY_MENU : emptyWeeklyMenu(),
    });

    await refetchProperty();
  };

  const resetConfig = async () => {
    if (!property) return;
    await supabase.from("properties").delete().eq("id", property.id);
    await refetchProperty();
  };

  return (
    <PGConfigContext.Provider value={{ config, setConfig, isSetupComplete, resetConfig }}>
      {children}
    </PGConfigContext.Provider>
  );
}

export const usePGConfig = () => useContext(PGConfigContext);
