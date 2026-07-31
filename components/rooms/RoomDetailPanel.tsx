"use client";

import { useState } from "react";
import { X, BedDouble, User, Wrench, Wifi, Wind, Droplets, DoorOpen, ShowerHead, BookOpen, Armchair, ArrowLeftRight, UserMinus, Pencil, Plus, Trash2, Save } from "lucide-react";
import { Chip, Button } from "@heroui/react";
import { useBeds } from "@/lib/BedContext";
import { useRooms } from "@/lib/RoomContext";
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

const ALL_AMENITIES = ["AC", "WiFi", "Attached Bath", "Common Bath", "Geyser", "Wardrobe", "Balcony", "Fan", "Study Table"];
const ROOM_TYPES = ["Single", "Double", "Triple"];
const TYPE_CAPACITY: Record<string, number> = { Single: 1, Double: 2, Triple: 3 };

interface Props {
  roomId: string;
  onClose: () => void;
}

export default function RoomDetailPanel({ roomId, onClose }: Props) {
  const { rooms, amenities: roomAmenities, totalFloors, refetch } = usePGData();
  const room = rooms.find((r) => r.id === roomId);
  const { getBedsForRoom, unassignBed } = useBeds();
  const { updateRoom, addBed, removeBed, syncRoomStatus } = useRooms();

  const [assignModal, setAssignModal] = useState<string | null>(null);
  const [transferModal, setTransferModal] = useState<{ bedId: string; tenantId: string; tenantName: string } | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ number: "", floor: 0, type: "Single", rent: 0, amenities: [] as string[] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!room) return null;

  const roomBeds = getBedsForRoom(roomId);
  const amenities = roomAmenities[roomId] || room.amenities || [];
  const capacity = TYPE_CAPACITY[room.type] || 1;

  const startEditing = () => {
    setEditData({
      number: room.number,
      floor: room.floor,
      type: room.type,
      rent: room.rent,
      amenities: [...amenities],
    });
    setError("");
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setError("");
  };

  const toggleAmenity = (amenity: string) => {
    setEditData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const handleSave = async () => {
    if (!editData.number.trim()) {
      setError("Room number is required");
      return;
    }
    if (editData.rent < 0) {
      setError("Rent cannot be negative");
      return;
    }

    const newCapacity = TYPE_CAPACITY[editData.type] || 1;
    const occupiedBeds = roomBeds.filter((b) => b.status === "occupied");

    if (newCapacity < occupiedBeds.length) {
      setError(`Cannot change to ${editData.type} — ${occupiedBeds.length} beds are occupied. Unassign tenants first.`);
      return;
    }

    setSaving(true);
    setError("");

    try {
      const changes: string[] = [];
      if (editData.number !== room.number) changes.push(`number: ${room.number} → ${editData.number}`);
      if (editData.floor !== room.floor) changes.push(`floor: ${room.floor} → ${editData.floor}`);
      if (editData.type !== room.type) changes.push(`type: ${room.type} → ${editData.type}`);
      if (editData.rent !== room.rent) changes.push(`rent: ₹${room.rent.toLocaleString("en-IN")} → ₹${editData.rent.toLocaleString("en-IN")}`);

      const description = changes.length > 0
        ? `Room ${editData.number}: ${changes.join(", ")}`
        : `Room ${editData.number}: amenities updated`;

      await updateRoom(roomId, editData, description);

      if (editData.type !== room.type) {
        const currentBedCount = roomBeds.length;
        if (newCapacity > currentBedCount) {
          const existingLabels = roomBeds.map((b) => b.label);
          const allLabels = ["A", "B", "C"];
          const labelsToAdd = allLabels.filter((l) => !existingLabels.includes(l)).slice(0, newCapacity - currentBedCount);
          for (const label of labelsToAdd) {
            await addBed(roomId, label, editData.number);
          }
        } else if (newCapacity < currentBedCount) {
          const availableBeds = roomBeds.filter((b) => b.status === "available");
          const bedsToRemove = availableBeds.slice(0, currentBedCount - newCapacity);
          for (const bed of bedsToRemove) {
            await removeBed(bed.id, bed.label, editData.number);
          }
        }
      }

      await syncRoomStatus(roomId);
      await refetch();
      setIsEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleAddBed = async () => {
    const newCapacity = TYPE_CAPACITY[editData.type] || 1;
    if (roomBeds.length >= newCapacity) return;

    const existingLabels = roomBeds.map((b) => b.label);
    const allLabels = ["A", "B", "C"];
    const nextLabel = allLabels.find((l) => !existingLabels.includes(l));
    if (!nextLabel) return;

    setSaving(true);
    try {
      await addBed(roomId, nextLabel, editData.number || room.number);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveBed = async (bedId: string, bedLabel: string) => {
    setSaving(true);
    try {
      await removeBed(bedId, bedLabel, editData.number || room.number);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cannot remove bed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Room {room.number}</h3>
            <p className="text-xs text-slate-500">{room.type} · Floor {room.floor} · {`₹${room.rent.toLocaleString("en-IN")}`}/mo</p>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button onClick={startEditing} className="p-2 hover:bg-indigo-50 rounded-lg transition-colors" title="Edit Room">
                <Pencil size={16} className="text-indigo-600" />
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <X size={18} className="text-slate-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {isEditing ? (
            <>
              {/* Edit Form */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-800">Room Properties</h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Room Number</label>
                    <input
                      type="text"
                      value={editData.number}
                      onChange={(e) => setEditData((p) => ({ ...p, number: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Floor</label>
                    <select
                      value={editData.floor}
                      onChange={(e) => setEditData((p) => ({ ...p, floor: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                    >
                      {Array.from({ length: totalFloors || 1 }, (_, i) => (
                        <option key={i} value={i}>{i === 0 ? "Ground" : `Floor ${i}`}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Type</label>
                    <select
                      value={editData.type}
                      onChange={(e) => setEditData((p) => ({ ...p, type: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                    >
                      {ROOM_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Rent (₹/mo)</label>
                    <input
                      type="number"
                      value={editData.rent}
                      onChange={(e) => setEditData((p) => ({ ...p, rent: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                      min={0}
                    />
                  </div>
                </div>

                {/* Amenities */}
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-2 block">Amenities</label>
                  <div className="flex flex-wrap gap-2">
                    {ALL_AMENITIES.map((amenity) => {
                      const isSelected = editData.amenities.includes(amenity);
                      return (
                        <button
                          key={amenity}
                          onClick={() => toggleAmenity(amenity)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${
                            isSelected
                              ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                              : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300"
                          }`}
                        >
                          {amenityIcons[amenity] || <Wifi size={14} />}
                          {amenity}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bed Management in Edit Mode */}
              <div>
                <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <BedDouble size={15} className="text-indigo-500" />
                  Beds ({roomBeds.length}/{TYPE_CAPACITY[editData.type] || 1})
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
                          <p className={`text-sm font-medium ${bed.status === "occupied" ? "text-slate-800" : "text-slate-400 italic"}`}>
                            {bed.tenantName || (bed.status === "maintenance" ? "Under Maintenance" : "Available")}
                          </p>
                        </div>
                        {bed.status === "available" && (
                          <button
                            onClick={() => handleRemoveBed(bed.id, bed.label)}
                            disabled={saving}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                            title="Remove Bed"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {roomBeds.length < (TYPE_CAPACITY[editData.type] || 1) && (
                    <button
                      onClick={handleAddBed}
                      disabled={saving}
                      className="p-3 rounded-lg border border-dashed border-indigo-300 bg-indigo-50/50 flex items-center justify-center gap-2 text-sm text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-50"
                    >
                      <Plus size={14} />
                      Add Bed
                    </button>
                  )}
                </div>
              </div>

            </>
          ) : (
            <>
              {/* View Mode (original) */}
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
            </>
          )}
        </div>

        {isEditing && (
          <div className="shrink-0 bg-white border-t border-slate-200 px-6 py-4 flex items-center gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              isDisabled={saving}
              className="flex-1"
            >
              <Save size={14} />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={cancelEditing}
              isDisabled={saving}
            >
              Cancel
            </Button>
          </div>
        )}
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
