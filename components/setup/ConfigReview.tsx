"use client";

import { useState } from "react";
import { PGConfig, PGRoom } from "@/lib/PGConfigContext";
import { Card, Button, Chip } from "@heroui/react";
import {
  Building2, DoorOpen, Bed, Shield, ChevronDown, ChevronUp,
  Plus, X, CheckCircle2,
} from "lucide-react";

interface Props {
  config: PGConfig;
  onConfirm: (config: PGConfig) => void;
  onBack: () => void;
}

const AMENITY_OPTIONS = [
  "WiFi", "AC", "Fan", "Geyser", "Attached Bath", "Common Bath",
  "Wardrobe", "Study Table", "Balcony", "TV", "Fridge", "Washing Machine",
];

export default function ConfigReview({ config, onConfirm, onBack }: Props) {
  const [editedConfig, setEditedConfig] = useState<PGConfig>({ ...config, setupComplete: true });
  const [expandedFloor, setExpandedFloor] = useState<number | null>(0);
  const [newRule, setNewRule] = useState("");

  const floors = Array.from({ length: editedConfig.floors }, (_, i) => i);

  const updateProperty = (field: string, value: string) => {
    setEditedConfig((prev) => ({
      ...prev,
      property: { ...prev.property, [field]: value },
    }));
  };

  const updateRoom = (roomId: number, field: keyof PGRoom, value: string | string[]) => {
    setEditedConfig((prev) => ({
      ...prev,
      rooms: prev.rooms.map((r) => (r.id === roomId ? { ...r, [field]: value } : r)),
    }));
  };

  const toggleAmenity = (roomId: number, amenity: string) => {
    const room = editedConfig.rooms.find((r) => r.id === roomId);
    if (!room) return;
    const amenities = room.amenities.includes(amenity)
      ? room.amenities.filter((a) => a !== amenity)
      : [...room.amenities, amenity];
    updateRoom(roomId, "amenities", amenities);
  };

  const addRule = () => {
    if (!newRule.trim()) return;
    setEditedConfig((prev) => ({ ...prev, rules: [...prev.rules, newRule.trim()] }));
    setNewRule("");
  };

  const removeRule = (index: number) => {
    setEditedConfig((prev) => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={28} className="text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Review Your PG Setup</h2>
        <p className="text-sm text-slate-500 mt-2">
          Review and edit the configuration before building your dashboard
        </p>
      </div>

      {/* Property Info */}
      <Card>
        <Card.Header className="px-5 pt-5 pb-0">
          <Card.Title className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Building2 size={15} className="text-indigo-500" />
            Property Details
          </Card.Title>
        </Card.Header>
        <Card.Content className="p-5">
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] text-slate-500 uppercase font-medium mb-1">Name</label>
              <input
                type="text"
                value={editedConfig.property.name}
                onChange={(e) => updateProperty("name", e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 uppercase font-medium mb-1">Address</label>
              <input
                type="text"
                value={editedConfig.property.address}
                onChange={(e) => updateProperty("address", e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 uppercase font-medium mb-1">Type</label>
              <select
                value={editedConfig.property.type}
                onChange={(e) => updateProperty("type", e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option>Boys PG</option>
                <option>Girls PG</option>
                <option>Co-ed PG</option>
                <option>Hostel</option>
              </select>
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* Floors & Rooms */}
      <Card>
        <Card.Header className="px-5 pt-5 pb-0">
          <Card.Title className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <DoorOpen size={15} className="text-teal-500" />
            Floors & Rooms ({editedConfig.rooms.length} rooms total)
          </Card.Title>
        </Card.Header>
        <Card.Content className="p-5 space-y-3">
          {floors.map((floor) => {
            const floorRooms = editedConfig.rooms.filter((r) => r.floor === floor);
            const isExpanded = expandedFloor === floor;
            return (
              <div key={floor} className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedFloor(isExpanded ? null : floor)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <span className="text-sm font-medium text-slate-800">
                    {floor === 0 ? "Ground Floor" : `Floor ${floor}`} — {floorRooms.length} rooms
                  </span>
                  {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </button>
                {isExpanded && (
                  <div className="p-4 space-y-3">
                    {floorRooms.map((room) => (
                      <div key={room.id} className="p-4 bg-white border border-slate-100 rounded-lg space-y-3">
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[10px] text-slate-500 uppercase font-medium mb-1">Room No.</label>
                            <input
                              type="text"
                              value={room.number}
                              onChange={(e) => updateRoom(room.id, "number", e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-500 uppercase font-medium mb-1">Type</label>
                            <select
                              value={room.type}
                              onChange={(e) => updateRoom(room.id, "type", e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                            >
                              <option>Single</option>
                              <option>Double</option>
                              <option>Triple</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-500 uppercase font-medium mb-1">Rent</label>
                            <input
                              type="text"
                              value={room.rent}
                              onChange={(e) => updateRoom(room.id, "rent", e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 uppercase font-medium mb-1.5">Amenities</label>
                          <div className="flex flex-wrap gap-1.5">
                            {AMENITY_OPTIONS.map((amenity) => (
                              <button
                                key={amenity}
                                onClick={() => toggleAmenity(room.id, amenity)}
                                className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                                  room.amenities.includes(amenity)
                                    ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                                    : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300"
                                }`}
                              >
                                {amenity}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <Bed size={12} />
                          {room.type === "Single" ? "1 bed" : room.type === "Double" ? "2 beds" : "3 beds"} (auto-generated)
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </Card.Content>
      </Card>

      {/* House Rules */}
      <Card>
        <Card.Header className="px-5 pt-5 pb-0">
          <Card.Title className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Shield size={15} className="text-amber-500" />
            House Rules
          </Card.Title>
        </Card.Header>
        <Card.Content className="p-5 space-y-3">
          {editedConfig.rules.map((rule, i) => (
            <div key={i} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
              <span className="text-sm text-slate-700 flex-1">{rule}</span>
              <button onClick={() => removeRule(i)} className="p-1 hover:bg-slate-200 rounded transition-colors">
                <X size={14} className="text-slate-400" />
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              type="text"
              value={newRule}
              onChange={(e) => setNewRule(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addRule()}
              placeholder="Add a rule..."
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 placeholder:text-slate-400"
            />
            <button
              onClick={addRule}
              disabled={!newRule.trim()}
              className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>
        </Card.Content>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4">
        <Button variant="outline" size="sm" onPress={onBack}>
          Back to Form
        </Button>
        <Button
          variant="primary"
          size="md"
          onPress={() => onConfirm(editedConfig)}
          className="px-8"
        >
          <CheckCircle2 size={16} />
          Confirm & Build My PG
        </Button>
      </div>
    </div>
  );
}
