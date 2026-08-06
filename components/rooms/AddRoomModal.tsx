"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { Button } from "@heroui/react";
import { supabase } from "@/lib/supabase";
import { usePropertyContext } from "@/lib/PropertyContext";

const AMENITY_OPTIONS = ["WiFi", "AC", "Fan", "Geyser", "Attached Bath", "Common Bath", "Wardrobe", "Study Table", "Balcony"];

interface AddRoomModalProps {
  totalFloors: number;
  onClose: () => void;
  onAdded: () => void;
}

export default function AddRoomModal({ totalFloors, onClose, onAdded }: AddRoomModalProps) {
  const { propertyId } = usePropertyContext();
  const [roomNumber, setRoomNumber] = useState("");
  const [floor, setFloor] = useState(0);
  const [type, setType] = useState<"Single" | "Double" | "Triple">("Double");
  const [rent, setRent] = useState("");
  const [amenities, setAmenities] = useState<string[]>(["Fan", "WiFi"]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const toggleAmenity = (a: string) => {
    setAmenities((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!roomNumber.trim()) {
      setError("Room number is required");
      return;
    }
    if (!rent.trim()) {
      setError("Rent amount is required");
      return;
    }
    if (!propertyId) {
      setError("No property selected");
      return;
    }

    setSubmitting(true);
    try {
      const rentNum = parseInt(rent.replace(/[^\d]/g, "")) || 0;

      const { data: roomRow, error: roomErr } = await supabase
        .from("rooms")
        .insert({
          property_id: propertyId,
          number: roomNumber.trim(),
          floor,
          type,
          rent: rentNum,
          amenities,
        })
        .select()
        .single();

      if (roomErr) throw new Error(roomErr.message);

      const bedCount = type === "Single" ? 1 : type === "Double" ? 2 : 3;
      const labels = ["A", "B", "C"];
      const bedInserts = Array.from({ length: bedCount }, (_, i) => ({
        room_id: roomRow.id,
        property_id: propertyId,
        label: labels[i],
        status: "available",
      }));

      await supabase.from("beds").insert(bedInserts);

      window.dispatchEvent(new Event("rooms-updated"));
      onAdded();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add room");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">Add New Room</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Room Number */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Room Number</label>
            <input
              type="text"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              placeholder="e.g., 101, G-05"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
            />
          </div>

          {/* Floor */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Floor</label>
            <select
              value={floor}
              onChange={(e) => setFloor(Number(e.target.value))}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
            >
              {Array.from({ length: Math.max(totalFloors, 1) }, (_, i) => (
                <option key={i} value={i}>{i === 0 ? "Ground Floor" : `Floor ${i}`}</option>
              ))}
            </select>
          </div>

          {/* Sharing Type */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Occupancy Type</label>
            <div className="flex gap-2">
              {(["Single", "Double", "Triple"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                    type === t
                      ? t === "Single"
                        ? "bg-amber-50 border-amber-300 text-amber-700"
                        : t === "Double"
                        ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                        : "bg-blue-50 border-blue-300 text-blue-700"
                      : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {t}
                  <span className="block text-[10px] font-normal mt-0.5">
                    {t === "Single" ? "1 bed" : t === "Double" ? "2 beds" : "3 beds"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Monthly Rent */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Monthly Rent</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">₹</span>
              <input
                type="text"
                value={rent}
                onChange={(e) => setRent(e.target.value)}
                placeholder="8,000"
                className="w-full pl-7 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
              />
            </div>
          </div>

          {/* Amenities */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Amenities</label>
            <div className="flex flex-wrap gap-2">
              {AMENITY_OPTIONS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleAmenity(a)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    amenities.includes(a)
                      ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                      : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" size="md" onPress={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
              isDisabled={submitting}
              className="flex-1"
            >
              <Plus size={14} />
              {submitting ? "Adding..." : "Add Room"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
