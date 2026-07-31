"use client";

import { Plus, Phone, MessageCircle, IndianRupee, Pencil, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Chip, Button } from "@heroui/react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useUserMode } from "@/lib/UserModeContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import RoomDetailPanel from "@/components/rooms/RoomDetailPanel";
import { usePGData } from "@/lib/usePGData";

export default function RoomsPage() {
  const { t } = useLanguage();
  const { mode } = useUserMode();
  const router = useRouter();
  const pgData = usePGData();
  const rooms = pgData.rooms;
  const beds = pgData.beds;
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);

  useEffect(() => {
    if (mode === "tenant") router.replace("/dashboard");
  }, [mode, router]);

  const floors = Array.from({ length: pgData.totalFloors }, (_, i) => i);
  const floorLabels: Record<number, string> = Object.fromEntries(
    floors.map((f) => [f, f === 0 ? "GROUND" : `FLOOR ${String(f).padStart(2, "0")}`])
  );

  const capacityMap: Record<string, number> = { Single: 1, Double: 2, Triple: 3 };

  const totalRooms = rooms.length;
  const occupiedCount = rooms.filter((r) => r.status === "Occupied").length;
  const vacantCount = rooms.filter((r) => r.status === "Vacant").length;

  if (pgData.loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-slate-500">Loading rooms...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t("rooms.title")}</h2>
          <p className="text-sm text-slate-500 mt-1">
            {totalRooms} total &middot;{" "}
            <span className="text-blue-600 font-medium">{occupiedCount} occupied</span> &middot;{" "}
            <span className="text-amber-600 font-medium">{vacantCount} vacant</span>
          </p>
        </div>
        <Button variant="primary" size="sm">
          <Plus size={14} />
          {t("rooms.addRoom")}
        </Button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-[11px] text-slate-500">Full</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          <span className="text-[11px] text-slate-500">Partial</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
          <span className="text-[11px] text-slate-500">Vacant</span>
        </div>
      </div>

      {/* Floor-based Room Grid */}
      {rooms.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-lg font-semibold text-slate-700 mb-2">No rooms yet</p>
          <p className="text-sm text-slate-500">Add rooms to your property to get started</p>
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
          <div className="space-y-10">
            {floors.map((floor) => {
              const floorRooms = rooms.filter((r) => r.floor === floor);
              if (floorRooms.length === 0) return null;

              return (
                <div key={floor}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                      {floorLabels[floor]}
                    </span>
                    <div className="h-[1px] flex-1 bg-slate-200" />
                    <span className="text-[10px] text-slate-400">
                      {floorRooms.filter((r) => r.status === "Occupied").length}/{floorRooms.length} occupied
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {floorRooms.map((room) => {
                      const capacity = capacityMap[room.type] || 1;
                      const roomBeds = beds.filter((b) => b.roomId === room.id);
                      const occupiedCount = room.tenants.length;
                      const isVacant = room.status === "Vacant";
                      const isPartial = !isVacant && occupiedCount < capacity;
                      const isHovered = hoveredRoom === room.id;

                      const statusDotColor = isVacant ? "bg-slate-300" : isPartial ? "bg-rose-500" : "bg-emerald-500";

                      return (
                        <div
                          key={room.id}
                          className="relative"
                          onMouseEnter={() => setHoveredRoom(room.id)}
                          onMouseLeave={() => setHoveredRoom(null)}
                        >
                        <div
                          className={`relative p-4 rounded-xl border transition-all duration-200 cursor-pointer group ${
                            isVacant
                              ? "border-dashed border-slate-300 bg-white/50 hover:border-indigo-300"
                              : "bg-white border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md"
                          }`}
                          onClick={() => setSelectedRoom(room.id)}
                        >
                          {/* Room Number + Status Dot */}
                          <div className="flex justify-between items-start mb-3">
                            <span className={`text-lg font-bold ${isVacant ? "text-slate-400" : "text-slate-800"}`}>
                              {room.number}
                            </span>
                            <span className={`w-2.5 h-2.5 rounded-full ${statusDotColor}`} />
                          </div>

                          {/* Bed Dots */}
                          <div className="flex items-center gap-1.5 mb-2">
                            {Array.from({ length: capacity }).map((_, i) => {
                              const bed = roomBeds[i];
                              const isOccupied = bed?.status === "occupied";
                              return (
                                <div key={i} className="flex flex-col items-center gap-0.5">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold ${
                                    isOccupied
                                      ? "bg-indigo-100 text-indigo-700 border border-indigo-200"
                                      : "bg-slate-100 text-slate-400 border border-dashed border-slate-300"
                                  }`}>
                                    {isOccupied ? bed.tenantName?.split(" ").map((n) => n[0]).join("") : "?"}
                                  </div>
                                </div>
                              );
                            })}
                            <span className="text-[10px] text-slate-400 ml-1">
                              {room.tenants.length}/{capacity}
                            </span>
                          </div>

                          {/* Room info */}
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-500">{room.type}</span>
                            <span className="text-[10px] font-medium text-slate-600">{`₹${room.rent.toLocaleString("en-IN")}`}</span>
                          </div>

                          {/* Quick Actions (visible on hover) */}
                          {!isVacant && (
                            <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white border border-slate-200 shadow-lg rounded-full px-2 py-1 transition-all duration-200 ${
                              isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
                            }`}>
                              <button
                                onClick={(e) => { e.stopPropagation(); alert("Collect rent - Razorpay integration coming soon"); }}
                                className="p-1.5 rounded-full hover:bg-emerald-50 text-emerald-600 transition-colors"
                                title="Collect Rent"
                              >
                                <IndianRupee size={12} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedRoom(room.id); }}
                                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600 transition-colors"
                                title="Edit"
                              >
                                <Pencil size={12} />
                              </button>
                            </div>
                          )}

                          {/* Vacant label */}
                          {isVacant && (
                            <p className="text-[11px] text-slate-400 italic mt-1">All beds available</p>
                          )}
                        </div>

                        {/* Tenant mini cards on hover */}
                        {isHovered && room.tenantDetails.length > 0 && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 z-20 pb-2">
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 shadow-xl min-w-[220px]">
                              <div className="space-y-1.5">
                                {room.tenantDetails.map((tenant) => (
                                  <Link
                                    key={tenant.id || tenant.name}
                                    href={tenant.id ? `/tenants/${tenant.id}` : "#"}
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-amber-100 transition-colors group/card"
                                  >
                                    <div className="w-9 h-9 rounded-full bg-amber-200 flex items-center justify-center text-xs font-bold text-amber-800 shrink-0">
                                      {tenant.name.split(" ").map((n) => n[0]).join("")}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-amber-900 truncate">{tenant.name}</p>
                                      <p className="text-[11px] text-amber-600">Bed {tenant.bedLabel}</p>
                                    </div>
                                    <ChevronRight size={14} className="text-amber-300 group-hover/card:text-amber-700 shrink-0" />
                                  </Link>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detail Panel */}
      {selectedRoom && (
        <RoomDetailPanel roomId={selectedRoom} onClose={() => setSelectedRoom(null)} />
      )}
    </div>
  );
}
