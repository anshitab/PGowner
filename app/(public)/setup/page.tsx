"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePGConfig, PGConfig, PGRoom, PGBed } from "@/lib/PGConfigContext";
import { usePropertyContext } from "@/lib/PropertyContext";
import ConfigReview from "@/components/setup/ConfigReview";
import VerificationStep from "@/components/setup/VerificationStep";
import { Building2, ImageIcon, X } from "lucide-react";
import { Button } from "@heroui/react";

export default function SetupPage() {
  const router = useRouter();
  const { setConfig, isSetupComplete } = usePGConfig();
  const { property, loading: propLoading } = usePropertyContext();

  // Form state
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [type, setType] = useState("Boys PG");
  const [floors, setFloors] = useState(2);
  const [roomsPerFloor, setRoomsPerFloor] = useState(4);
  const [sharingType, setSharingType] = useState<"Single" | "Double" | "Triple" | "Mix">("Double");
  const [rentSingle, setRentSingle] = useState("₹12,000");
  const [rentDouble, setRentDouble] = useState("₹8,000");
  const [rentTriple, setRentTriple] = useState("₹6,000");
  const [amenities, setAmenities] = useState<string[]>(["Fan", "WiFi"]);
  const [pgPhotos, setPgPhotos] = useState<{ file: File; preview: string }[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Review state
  const [showReview, setShowReview] = useState(false);
  const [generatedConfig, setGeneratedConfig] = useState<PGConfig | null>(null);

  useEffect(() => {
    if (!propLoading && isSetupComplete) {
      router.replace("/dashboard");
    }
  }, [isSetupComplete, propLoading, router]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newPhotos = files
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, 6 - pgPhotos.length)
      .map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setPgPhotos((prev) => [...prev, ...newPhotos].slice(0, 6));
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const removePhoto = (index: number) => {
    setPgPhotos((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
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
      for (let r = 1; r <= roomsPerFloor; r++) {
        const number = floor === 0 ? `G-${String(r).padStart(2, "0")}` : `${floor}${String(r).padStart(2, "0")}`;

        let roomType: "Single" | "Double" | "Triple";
        let rent: string;

        // Always create a mix: first 1/3 single, next 1/3 double, rest triple
        const third = Math.ceil(roomsPerFloor / 3);
        if (r <= third) { roomType = "Single"; rent = rentSingle; }
        else if (r <= third * 2) { roomType = "Double"; rent = rentDouble; }
        else { roomType = "Triple"; rent = rentTriple; }

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
    };

    setGeneratedConfig(config);
    setShowReview(true);
  };

  const [setupError, setSetupError] = useState("");
  const [showVerification, setShowVerification] = useState(false);

  const handleConfirm = async (finalConfig: PGConfig) => {
    setSetupError("");
    try {
      await setConfig(finalConfig);
      setShowVerification(true);
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

  if (isSetupComplete && !showVerification) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (showVerification && property) {
    return (
      <div className="min-h-screen bg-slate-50 py-10 px-4">
        <VerificationStep
          propertyId={property.id}
          onComplete={() => router.replace("/dashboard")}
          onSkip={() => router.replace("/dashboard")}
        />
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
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-4">
            <Building2 size={24} className="text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Set up your PG</h1>
          <p className="text-sm text-slate-500 mt-1">Fill in the basics and we'll generate your dashboard</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">

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

          {/* PG Photos */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
              <ImageIcon size={12} />
              PG Photos <span className="text-slate-400 font-normal">(optional, max 6)</span>
            </label>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/jpg"
              multiple
              onChange={handlePhotoUpload}
              className="hidden"
            />
            {pgPhotos.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
                {pgPhotos.map((photo, i) => (
                  <div key={i} className="relative shrink-0">
                    <img src={photo.preview} alt={`PG photo ${i + 1}`} className="w-28 h-20 rounded-lg object-cover border border-slate-200" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {pgPhotos.length < 6 && (
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="w-full border-2 border-dashed border-slate-300 rounded-lg py-4 text-center hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors"
              >
                <ImageIcon size={20} className="mx-auto text-slate-400 mb-1" />
                <p className="text-xs text-slate-500">Click to upload photos</p>
              </button>
            )}
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

          {/* Amenities */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Amenities</label>
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
              {floors * roomsPerFloor} rooms · {(() => {
                const third = Math.ceil(roomsPerFloor / 3);
                let beds = 0;
                for (let r = 1; r <= roomsPerFloor; r++) {
                  if (r <= third) beds += 1;
                  else if (r <= third * 2) beds += 2;
                  else beds += 3;
                }
                return beds * floors;
              })()} beds · {floors} floor{floors > 1 ? "s" : ""} · Mixed sharing (Single, Double, Triple)
            </p>
          </div>

          {/* Submit */}
          <Button
            variant="primary"
            size="md"
            onPress={generateConfig}
            className="w-full"
          >
            <Building2 size={16} />
            Generate My PG Setup
          </Button>
        </div>
      </div>
    </div>
  );
}
