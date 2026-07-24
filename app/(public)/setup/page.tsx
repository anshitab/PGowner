"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { usePGConfig, PGConfig, PGRoom, PGBed } from "@/lib/PGConfigContext";
import { usePropertyContext } from "@/lib/PropertyContext";
import ConfigReview from "@/components/setup/ConfigReview";
import { Building2, MapPin, Search, ImageIcon } from "lucide-react";
import { Button } from "@heroui/react";

interface PlacePrediction {
  place_id: string;
  description: string;
  name?: string;
  lat?: string;
  lon?: string;
}

interface PlaceDetails {
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  photos: string[];
}

export default function SetupPage() {
  const router = useRouter();
  const { setConfig, isSetupComplete } = usePGConfig();
  const { loading: propLoading } = usePropertyContext();

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

  // Places autocomplete
  const [searchQuery, setSearchQuery] = useState("");
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [placePhotos, setPlacePhotos] = useState<string[]>([]);
  const [loadingPlace, setLoadingPlace] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Review state
  const [showReview, setShowReview] = useState(false);
  const [generatedConfig, setGeneratedConfig] = useState<PGConfig | null>(null);

  useEffect(() => {
    if (!propLoading && isSetupComplete) {
      router.replace("/dashboard");
    }
  }, [isSetupComplete, propLoading, router]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowPredictions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const searchPlaces = useCallback((query: string) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!query.trim() || query.length < 3) {
      setPredictions([]);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setPredictions(data.predictions || []);
        setShowPredictions(true);
      } catch {
        setPredictions([]);
      }
    }, 300);
  }, []);

  const selectPlace = async (prediction: PlacePrediction) => {
    setShowPredictions(false);
    setSearchQuery(prediction.description);
    setLoadingPlace(true);

    try {
      const res = await fetch("/api/places", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeId: prediction.place_id,
          name: prediction.name,
          description: prediction.description,
          lat: prediction.lat,
          lon: prediction.lon,
        }),
      });
      const data = await res.json();
      if (data.details) {
        const details: PlaceDetails = data.details;
        if (details.name) setName(details.name);
        if (details.address) setAddress(details.address);
        if (details.photos.length > 0) setPlacePhotos(details.photos);
      }
    } catch {
      // Silently fail — user can still type manually
    }
    setLoadingPlace(false);
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

  const handleConfirm = async (finalConfig: PGConfig) => {
    setSetupError("");
    try {
      await setConfig(finalConfig);
      router.replace("/dashboard");
    } catch (err: unknown) {
      setSetupError(err instanceof Error ? err.message : "Setup failed. Please try again.");
    }
  };

  if (propLoading || isSetupComplete) {
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

          {/* Google Places Search */}
          <div ref={dropdownRef} className="relative">
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Search your PG on Google</label>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); searchPlaces(e.target.value); }}
                onFocus={() => predictions.length > 0 && setShowPredictions(true)}
                placeholder="Search PG name or address..."
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
              />
            </div>
            {showPredictions && predictions.length > 0 && (
              <div className="absolute z-20 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                {predictions.map((p) => (
                  <button
                    key={p.place_id}
                    onClick={() => selectPlace(p)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                  >
                    <MapPin size={14} className="text-slate-400 shrink-0" />
                    <span className="text-sm text-slate-700 truncate">{p.description}</span>
                  </button>
                ))}
              </div>
            )}
            {loadingPlace && (
              <p className="text-xs text-indigo-500 mt-1">Fetching details...</p>
            )}
          </div>

          {/* Photos from Google */}
          {placePhotos.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                <ImageIcon size={12} />
                Photos from Google
              </label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {placePhotos.map((url, i) => (
                  <img key={i} src={url} alt={`PG photo ${i + 1}`} className="w-32 h-24 rounded-lg object-cover border border-slate-200 shrink-0" />
                ))}
              </div>
            </div>
          )}

          {/* Property Name & Address */}
          <div className="grid sm:grid-cols-2 gap-4">
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
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Address / Area</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g., Koramangala, Bangalore"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
              />
            </div>
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
