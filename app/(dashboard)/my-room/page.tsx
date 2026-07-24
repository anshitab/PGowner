"use client";

import { useState, useEffect } from "react";
import { useUserMode } from "@/lib/UserModeContext";
import { useAuth } from "@/lib/AuthContext";
import { usePropertyContext } from "@/lib/PropertyContext";
import { usePGData } from "@/lib/usePGData";
import { useBeds } from "@/lib/BedContext";
import { useSettings } from "@/lib/SettingsContext";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Card, Chip } from "@heroui/react";
import {
  Home, Bed, Users, Wifi, Wind, Droplets, ShowerHead,
  DoorOpen, BookOpen, Flower2, CheckCircle2, AlertCircle,
} from "lucide-react";

const amenityIcons: Record<string, typeof Wifi> = {
  WiFi: Wifi,
  AC: Wind,
  Geyser: Droplets,
  "Attached Bath": ShowerHead,
  "Common Bath": ShowerHead,
  Wardrobe: DoorOpen,
  "Study Table": BookOpen,
  Balcony: Flower2,
  Fan: Wind,
};

export default function MyRoomPage() {
  const { mode } = useUserMode();
  const { user } = useAuth();
  const { property } = usePropertyContext();
  const { rooms, amenities: roomAmenities } = usePGData();
  const { beds } = useBeds();
  const { settings } = useSettings();
  const router = useRouter();
  const [tenant, setTenant] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (mode === "owner") router.replace("/dashboard");
  }, [mode, router]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("tenants")
        .select("*, rooms(number, floor, type, rent)")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setTenant(data);
    })();
  }, [user]);

  if (mode === "owner") return null;

  const roomData = tenant?.rooms as { number: string; floor: number; type: string; rent: number } | null;
  const roomId = tenant?.room_id as string | null;
  const roomBeds = roomId ? beds.filter((b) => b.roomId === roomId) : [];
  const roomAmenitiesList = roomId ? (roomAmenities[roomId] || []) : [];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-slate-900">My Room</h2>
        <p className="text-sm text-slate-500 mt-1">
          Room {roomData?.number || "-"} · {property?.name || ""}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <Card.Header className="px-5 pt-5 pb-0">
              <Card.Title className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Home size={15} className="text-indigo-500" />
                Room Overview
              </Card.Title>
            </Card.Header>
            <Card.Content className="p-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 bg-indigo-50 rounded-xl">
                  <p className="text-[10px] text-indigo-600 uppercase font-medium mb-1">Room Number</p>
                  <p className="text-lg font-bold text-indigo-900">{roomData?.number || "-"}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-[10px] text-slate-500 uppercase font-medium mb-1">Room Type</p>
                  <p className="text-lg font-bold text-slate-900">{roomData?.type || "-"} Sharing</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-[10px] text-slate-500 uppercase font-medium mb-1">Floor</p>
                  <p className="text-lg font-bold text-slate-900">
                    {roomData ? (roomData.floor === 0 ? "Ground" : `Floor ${roomData.floor}`) : "-"}
                  </p>
                </div>
                <div className="p-4 bg-emerald-50 rounded-xl">
                  <p className="text-[10px] text-emerald-600 uppercase font-medium mb-1">Monthly Rent</p>
                  <p className="text-lg font-bold text-emerald-900">
                    {roomData ? `₹${roomData.rent.toLocaleString("en-IN")}` : "-"}
                  </p>
                </div>
              </div>
            </Card.Content>
          </Card>

          <Card>
            <Card.Header className="px-5 pt-5 pb-0">
              <Card.Title className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Bed size={15} className="text-teal-500" />
                Bed Allocation
              </Card.Title>
            </Card.Header>
            <Card.Content className="p-5">
              {roomBeds.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {roomBeds.map((bed) => (
                    <div
                      key={bed.id}
                      className={`p-4 rounded-xl border ${
                        bed.tenantName === user?.name
                          ? "bg-indigo-50 border-indigo-200"
                          : bed.status === "occupied"
                          ? "bg-slate-50 border-slate-200"
                          : "bg-emerald-50 border-emerald-200"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-700">Bed {bed.label}</span>
                        {bed.tenantName === user?.name && (
                          <Chip size="sm" variant="soft" color="accent">You</Chip>
                        )}
                      </div>
                      <p className="text-sm font-medium text-slate-800">
                        {bed.tenantName || "Available"}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">No bed data available</p>
              )}
            </Card.Content>
          </Card>

          <Card>
            <Card.Header className="px-5 pt-5 pb-0">
              <Card.Title className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Wifi size={15} className="text-blue-500" />
                Room Amenities
              </Card.Title>
            </Card.Header>
            <Card.Content className="p-5">
              {roomAmenitiesList.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {roomAmenitiesList.map((amenity) => {
                    const Icon = amenityIcons[amenity] || CheckCircle2;
                    return (
                      <div key={amenity} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <Icon size={16} className="text-slate-500" />
                        <span className="text-sm text-slate-700">{amenity}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">No amenities listed</p>
              )}
            </Card.Content>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <Card.Header className="px-5 pt-5 pb-0">
              <Card.Title className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Users size={15} className="text-purple-500" />
                Roommates
              </Card.Title>
            </Card.Header>
            <Card.Content className="p-5 space-y-3">
              {roomBeds
                .filter((b) => b.tenantName && b.tenantName !== user?.name)
                .map((bed) => (
                  <div key={bed.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-700">
                      {bed.tenantName!.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{bed.tenantName}</p>
                      <p className="text-[11px] text-slate-500">Bed {bed.label}</p>
                    </div>
                  </div>
                ))}
              {roomBeds.filter((b) => b.tenantName && b.tenantName !== user?.name).length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">No roommates</p>
              )}
            </Card.Content>
          </Card>

          <Card>
            <Card.Header className="px-5 pt-5 pb-0">
              <Card.Title className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <AlertCircle size={15} className="text-amber-500" />
                PG Rules
              </Card.Title>
            </Card.Header>
            <Card.Content className="p-5">
              {settings.pgRules.length > 0 ? (
                <ul className="space-y-2 text-xs text-slate-600">
                  {settings.pgRules.map((rule, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-slate-400">•</span>{rule}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">No rules defined</p>
              )}
            </Card.Content>
          </Card>
        </div>
      </div>
    </div>
  );
}
