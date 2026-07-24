"use client";

import { useState } from "react";
import { X, BedDouble, User, Wrench, Wifi, Wind, Droplets, DoorOpen, ShowerHead, BookOpen, Armchair, ArrowLeftRight, UserMinus } from "lucide-react";
import { Chip } from "@heroui/react";
import { useBeds } from "@/lib/BedContext";
import { usePGData } from "@/lib/usePGData";
import BedManagementModal from "./BedManagementModal";
import BedTransferModal from "./BedTransferModal";

const amenityIcons: Record<string, React.ReactNode> = {
  AC: <Wind size={14} />,
  WiFi: <Wifi size={14} />,
  "Attached Bath": <ShowerHead size={14} />,
  "Common Bath": <ShowerHead size={14} />,
  Geyser: <Droplets size={14} />,
  Wardrobe: <Armchair size={14} />,
  Balcony: <DoorOpen size={14} />,
  Fan: <Wind size={14} />,
  "Study Table": <BookOpen size={14} />,
};

interface Props {
  roomId: string;
  onClose: () => void;
}

export default function RoomDetailPanel({ roomId, onClose }: Props) {
  const { rooms, amenities: roomAmenities } = usePGData();
  const room = rooms.find((r) => r.id === roomId);
  const { getBedsForRoom, unassignBed } = useBeds();
  const [assignModal, setAssignModal] = useState<string | null>(null);
  const [transferModal, setTransferModal] = useState<{ bedId: string; tenantId: string; tenantName: string } | null>(null);

  if (!room) return null;

  const roomBeds = getBedsForRoom(roomId);
  const amenities = roomAmenities[roomId] || room.amenities || [];
  const capacity = room.type === "Single" ? 1 : room.type === "Double" ? 2 : 3;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Room {room.number}</h3>
            <p className="text-xs text-slate-500">{room.type} · Floor {room.floor} · {`₹${room.rent.toLocaleString("en-IN")}`}/mo</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status */}
          <div className="flex items-center gap-3">
            <Chip size="sm" variant="soft" color={room.status === "Occupied" ? "success" : "warning"}>
              {room.status}
            </Chip>
            <span className="text-sm text-slate-500">
              {roomBeds.filter((b) => b.status === "occupied").length}/{capacity} beds occupied
            </span>
          </div>

          {/* Bed Allocation */}
          <div>
            <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <BedDouble size={15} className="text-indigo-500" />
              Bed Allocation
            </h4>
            <div className="grid gap-2">
              {roomBeds.map((bed) => (
                <div
                  key={bed.id}
                  className={`p-3 rounded-lg border ${
                    bed.status === "occupied"
                      ? "bg-blue-50 border-blue-200"
                      : bed.status === "maintenance"
                      ? "bg-amber-50 border-amber-200"
                      : "bg-slate-50 border-dashed border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        bed.status === "occupied" ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-500"
                      }`}>
                        {bed.label}
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${bed.status === "occupied" ? "text-slate-800" : "text-slate-400 italic"}`}>
                          {bed.tenantName || (bed.status === "maintenance" ? "Under Maintenance" : "Available")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {bed.status === "available" && (
                        <button
                          onClick={() => setAssignModal(bed.id)}
                          className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md"
                        >
                          Assign
                        </button>
                      )}
                      {bed.status === "occupied" && (
                        <>
                          <button
                            onClick={() => setTransferModal({ bedId: bed.id, tenantId: bed.tenantId!, tenantName: bed.tenantName! })}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Transfer"
                          >
                            <ArrowLeftRight size={13} />
                          </button>
                          <button
                            onClick={() => unassignBed(bed.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Unassign"
                          >
                            <UserMinus size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Amenities */}
          <div>
            <h4 className="text-sm font-semibold text-slate-800 mb-3">Amenities</h4>
            {amenities.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {amenities.map((amenity) => (
                  <div key={amenity} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                    {amenityIcons[amenity] || <Wifi size={14} />}
                    {amenity}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No amenities listed</p>
            )}
          </div>

          {/* Tenants */}
          {room.tenants.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <User size={15} className="text-violet-500" />
                Tenants
              </h4>
              <div className="space-y-2">
                {room.tenants.map((name, i) => (
                  <div key={i} className="p-3 bg-slate-50 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700">
                        {name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{name}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Maintenance History */}
          <div>
            <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Wrench size={15} className="text-amber-500" />
              Maintenance History
            </h4>
            <p className="text-sm text-slate-400 text-center py-4">No maintenance records</p>
          </div>
        </div>
      </div>

      {assignModal && (
        <BedManagementModal bedId={assignModal} roomId={roomId} onClose={() => setAssignModal(null)} />
      )}
      {transferModal && (
        <BedTransferModal
          bedId={transferModal.bedId}
          tenantId={transferModal.tenantId}
          tenantName={transferModal.tenantName}
          onClose={() => setTransferModal(null)}
        />
      )}
    </div>
  );
}
