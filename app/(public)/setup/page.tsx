"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePGConfig, PGConfig, PGRoom, PGBed } from "@/lib/PGConfigContext";
import { usePropertyContext } from "@/lib/PropertyContext";
import { useAuth } from "@/lib/AuthContext";
import ConfigReview from "@/components/setup/ConfigReview";
import { Building2, Pencil, ArrowRight, ArrowLeft, Plus, Minus } from "lucide-react";
import { Button } from "@heroui/react";
import { motion } from "motion/react";

export default function SetupPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>}>
      <SetupContent />
    </Suspense>
  );
}

function SetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAddMode = searchParams.get("add") === "true";
  const { setConfig, isSetupComplete } = usePGConfig();
  const { loading: propLoading } = usePropertyContext();
  const { isAuthenticated, user, loading: authLoading } = useAuth();

  // Form state
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [type, setType] = useState("Boys PG");
  const [floors, setFloors] = useState(2);
  const [roomsPerFloor, setRoomsPerFloor] = useState(4);
  const [perFloorRooms, setPerFloorRooms] = useState<number[]>([4, 4]);
  const [sharingType, setSharingType] = useState<"Single" | "Double" | "Triple" | "Mix">("Double");
  const [rentSingle, setRentSingle] = useState("₹12,000");
  const [rentDouble, setRentDouble] = useState("₹8,000");
  const [rentTriple, setRentTriple] = useState("₹6,000");
  const [amenities, setAmenities] = useState<string[]>(["Fan", "WiFi"]);
  const [foodIncluded, setFoodIncluded] = useState(false);
  const [roomNumbers, setRoomNumbers] = useState<string[][]>([]);
  // Room sharing type map: key = "floorIdx-roomIdx", value = "Single" | "Double" | "Triple"
  const [roomTypes, setRoomTypes] = useState<Record<string, "Single" | "Double" | "Triple">>({});
  const [step, setStep] = useState(1);
  const [setupError, setSetupError] = useState("");

  // Review state
  const [showReview, setShowReview] = useState(false);
  const [generatedConfig, setGeneratedConfig] = useState<PGConfig | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || user?.role === "tenant") {
      router.replace("/login?role=owner");
      return;
    }
    if (!propLoading && isSetupComplete && !isAddMode) {
      router.replace("/dashboard");
    }
  }, [isSetupComplete, propLoading, router, isAddMode, authLoading, isAuthenticated, user]);

  useEffect(() => {
    setPerFloorRooms((prev) => {
      const updated = Array.from({ length: floors }, (_, i) => prev[i] ?? roomsPerFloor);
      return updated;
    });
  }, [floors, roomsPerFloor]);

  useEffect(() => {
    const generated: string[][] = [];
    for (let floor = 0; floor < floors; floor++) {
      const count = perFloorRooms[floor] ?? roomsPerFloor;
      const floorRooms: string[] = [];
      for (let r = 1; r <= count; r++) {
        floorRooms.push(floor === 0 ? `G-${String(r).padStart(2, "0")}` : `${floor}${String(r).padStart(2, "0")}`);
      }
      generated.push(floorRooms);
    }
    setRoomNumbers(generated);
  }, [floors, perFloorRooms, roomsPerFloor]);

  if (authLoading || !isAuthenticated || user?.role === "tenant") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const updateRoomNumber = (floorIdx: number, roomIdx: number, value: string) => {
    setRoomNumbers((prev) => {
      const updated = prev.map((f) => [...f]);
      updated[floorIdx][roomIdx] = value;
      return updated;
    });
  };

  const addRoomToFloor = (floorIdx: number) => {
    setPerFloorRooms((prev) => {
      const updated = [...prev];
      if (updated[floorIdx] < 20) updated[floorIdx] = updated[floorIdx] + 1;
      return updated;
    });
  };

  const removeRoomFromFloor = (floorIdx: number) => {
    setPerFloorRooms((prev) => {
      const updated = [...prev];
      if (updated[floorIdx] > 1) updated[floorIdx] = updated[floorIdx] - 1;
      return updated;
    });
  };

  const cycleRoomType = (floorIdx: number, roomIdx: number) => {
    const key = `${floorIdx}-${roomIdx}`;
    setRoomTypes((prev) => {
      const current = prev[key] || "Double";
      const next = current === "Single" ? "Double" : current === "Double" ? "Triple" : "Single";
      return { ...prev, [key]: next };
    });
  };

  const getRoomTypeColor = (floorIdx: number, roomIdx: number) => {
    const key = `${floorIdx}-${roomIdx}`;
    const t = roomTypes[key] || "Double";
    if (t === "Single") return "bg-amber-100 border-amber-300 text-amber-800";
    if (t === "Double") return "bg-emerald-100 border-emerald-300 text-emerald-800";
    return "bg-blue-100 border-blue-300 text-blue-800";
  };

  const toggleAmenity = (amenity: string) => {
    setAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  };

  const generateConfig = () => {
    const rooms: PGRoom[] = [];
    const beds: PGBed[] = [];
    let roomId = 1;
    let bedId = 1;

    for (let floor = 0; floor < floors; floor++) {
      const count = perFloorRooms[floor] ?? roomsPerFloor;
      for (let r = 1; r <= count; r++) {
        const number = roomNumbers[floor]?.[r - 1] || (floor === 0 ? `G-${String(r).padStart(2, "0")}` : `${floor}${String(r).padStart(2, "0")}`);

        const key = `${floor}-${r - 1}`;
        const roomType: "Single" | "Double" | "Triple" = roomTypes[key] || "Double";
        const rent = roomType === "Single" ? rentSingle : roomType === "Double" ? rentDouble : rentTriple;

        rooms.push({ id: roomId, number, floor, type: roomType, rent, amenities });

        const bedCount = roomType === "Single" ? 1 : roomType === "Double" ? 2 : 3;
        const labels = ["A", "B", "C"];
        for (let b = 0; b < bedCount; b++) {
          beds.push({ id: bedId++, roomId, label: labels[b], tenantName: null, status: "available" });
        }
        roomId++;
      }
    }

    const config: PGConfig = {
      property: { name: name || "My PG", address: address || "India", type },
      floors,
      rooms,
      beds,
      rules: ["Rent due by 5th of every month", "Gate closes at 11 PM", "No smoking inside premises", "Visitors allowed 9 AM - 8 PM"],
      setupComplete: false,
      foodIncluded,
    };

    setGeneratedConfig(config);
    setShowReview(true);
  };

  const handleConfirm = async (finalConfig: PGConfig) => {
    setSetupError("");
    try {
      await setConfig(finalConfig);
      router.replace("/dashboard");
    } catch (err: unknown) {
      setSetupError(err instanceof Error ? err.message : "Setup failed. Please try again.");
    }
  };

  if (propLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (isSetupComplete && !isAddMode) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (showReview && generatedConfig) {
    return (
      <div className="min-h-screen bg-slate-50 py-10 px-4">
        {setupError && (
          <div className="max-w-3xl mx-auto mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {setupError}
          </div>
        )}
        <ConfigReview config={generatedConfig} onConfirm={handleConfirm} onBack={() => setShowReview(false)} />
      </div>
    );
  }

  const AMENITY_OPTIONS = ["WiFi", "AC", "Fan", "Geyser", "Attached Bath", "Common Bath", "Wardrobe", "Study Table", "Balcony"];

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <motion.div
        className="w-full max-w-2xl space-y-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {/* Header */}
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-4">
            <Building2 size={24} className="text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Set up your PG</h1>
          <p className="text-sm text-slate-500 mt-1">
            {step === 1 ? "Fill in property details and room layout" : "Select amenities and review"}
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className={`h-1.5 w-12 rounded-full transition-colors ${step >= 1 ? "bg-indigo-500" : "bg-slate-200"}`} />
            <div className={`h-1.5 w-12 rounded-full transition-colors ${step >= 2 ? "bg-indigo-500" : "bg-slate-200"}`} />
          </div>
        </div>

        {/* Step 1: Property Details + Room Numbers */}
        {step === 1 && (
          <motion.div
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Property Name */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Property Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Sunshine PG"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
              />
            </div>

            {/* Full Address */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Full Address</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g., #42, 1st Cross, 5th Block, Koramangala, Bangalore - 560034"
                rows={2}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 resize-none"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">PG Type</label>
              <div className="flex gap-2 flex-wrap">
                {["Boys PG", "Girls PG", "Co-ed PG", "Hostel"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                      type === t
                        ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm"
                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Floors & Rooms */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Number of Floors</label>
                <select
                  value={floors}
                  onChange={(e) => setFloors(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                >
                  {[1, 2, 3, 4, 5, 6].map((f) => (
                    <option key={f} value={f}>{f === 1 ? "Ground only" : `Ground + ${f - 1}`} ({f} floor{f > 1 ? "s" : ""})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Rooms per Floor</label>
                <select
                  value={roomsPerFloor}
                  onChange={(e) => setRoomsPerFloor(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                >
                  {[2, 3, 4, 5, 6, 8, 10].map((r) => (
                    <option key={r} value={r}>{r} rooms</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Rent */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Monthly Rent per Room (Mixed sharing: Single, Double, Triple)</label>
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-[11px] text-slate-500">Single</span>
                  <input type="text" value={rentSingle} onChange={(e) => setRentSingle(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">Double</span>
                  <input type="text" value={rentDouble} onChange={(e) => setRentDouble(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">Triple</span>
                  <input type="text" value={rentTriple} onChange={(e) => setRentTriple(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
                </div>
              </div>
            </div>

            {/* Room Numbers (Floor-wise) */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Pencil size={12} />
                Room Numbers <span className="text-slate-400 font-normal">(edit floor-wise)</span>
              </label>
              <div className="space-y-3">
                {roomNumbers.map((floorRooms, floorIdx) => (
                  <div key={floorIdx} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] font-medium text-slate-500">
                        {floorIdx === 0 ? "Ground Floor" : `Floor ${floorIdx}`}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => removeRoomFromFloor(floorIdx)}
                          className="w-6 h-6 flex items-center justify-center rounded-md bg-white border border-slate-200 text-slate-500 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="text-[11px] text-slate-500 min-w-[3ch] text-center">{perFloorRooms[floorIdx]}</span>
                        <button
                          type="button"
                          onClick={() => addRoomToFloor(floorIdx)}
                          className="w-6 h-6 flex items-center justify-center rounded-md bg-white border border-slate-200 text-slate-500 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600 transition-colors"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {floorRooms.map((roomNum, roomIdx) => (
                        <input
                          key={roomIdx}
                          type="text"
                          value={roomNum}
                          onChange={(e) => updateRoomNumber(floorIdx, roomIdx, e.target.value)}
                          className="w-20 px-2 py-1.5 bg-white border border-slate-200 rounded-md text-xs text-center focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Room Type Assignment (Color blocks) */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Room Sharing Type <span className="text-slate-400 font-normal">(tap to cycle)</span>
              </label>
              <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-amber-200 border border-amber-400" />
                  <span className="text-[11px] text-slate-500">Single</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-emerald-200 border border-emerald-400" />
                  <span className="text-[11px] text-slate-500">Double</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-blue-200 border border-blue-400" />
                  <span className="text-[11px] text-slate-500">Triple</span>
                </div>
              </div>
              <div className="space-y-3">
                {roomNumbers.map((floorRooms, floorIdx) => (
                  <div key={floorIdx} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-[11px] font-medium text-slate-500 mb-2">
                      {floorIdx === 0 ? "Ground Floor" : `Floor ${floorIdx}`}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {floorRooms.map((roomNum, roomIdx) => (
                        <button
                          key={roomIdx}
                          type="button"
                          onClick={() => cycleRoomType(floorIdx, roomIdx)}
                          className={`w-20 px-2 py-2 rounded-md text-xs text-center font-medium border-2 transition-all cursor-pointer hover:scale-105 ${getRoomTypeColor(floorIdx, roomIdx)}`}
                        >
                          {roomNum}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Next button */}
            <Button
              variant="primary"
              size="md"
              onPress={() => setStep(2)}
              className="w-full"
            >
              Next: Amenities
              <ArrowRight size={16} />
            </Button>
          </motion.div>
        )}

        {/* Step 2: Amenities + Summary */}
        {step === 2 && (
          <motion.div
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Amenities */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Select Amenities</label>
              <p className="text-[11px] text-slate-400 mb-3">Choose what your PG offers</p>
              <label className="mb-4 flex cursor-pointer items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                <input
                  type="checkbox"
                  checked={foodIncluded}
                  onChange={(e) => setFoodIncluded(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>
                  <span className="block text-sm font-medium text-slate-900">PG with food (meals included)</span>
                  <span className="mt-1 block text-xs text-slate-600">
                    Enables the weekly food menu in the sidebar for you and your tenants.
                  </span>
                </span>
              </label>
              <div className="flex flex-wrap gap-2">
                {AMENITY_OPTIONS.map((a) => (
                  <button
                    key={a}
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

            {/* Summary */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-xs text-slate-500 mb-1">This will generate:</p>
              <p className="text-sm font-medium text-slate-800">
                {perFloorRooms.reduce((a, b) => a + b, 0)} rooms · {(() => {
                  let beds = 0;
                  for (let floor = 0; floor < floors; floor++) {
                    const count = perFloorRooms[floor] ?? roomsPerFloor;
                    for (let r = 0; r < count; r++) {
                      const t = roomTypes[`${floor}-${r}`] || "Double";
                      beds += t === "Single" ? 1 : t === "Double" ? 2 : 3;
                    }
                  }
                  return beds;
                })()} beds · {floors} floor{floors > 1 ? "s" : ""} · Custom sharing layout
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="md"
                onPress={() => setStep(1)}
                className="flex-1"
              >
                <ArrowLeft size={16} />
                Back
              </Button>
              <Button
                variant="primary"
                size="md"
                onPress={generateConfig}
                className="flex-1"
              >
                <Building2 size={16} />
                Generate My PG Setup
              </Button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
