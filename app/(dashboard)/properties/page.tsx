"use client";

import { usePropertyContext } from "@/lib/PropertyContext";
import { usePGData } from "@/lib/usePGData";
import { Building2, Plus, MapPin, Check } from "lucide-react";
import { Card, Button, ProgressBar } from "@heroui/react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useUserMode } from "@/lib/UserModeContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function PropertiesPage() {
  const { t } = useLanguage();
  const { mode } = useUserMode();
  const router = useRouter();
  const { property, properties, loading, selectProperty } = usePropertyContext();
  const pgData = usePGData();

  useEffect(() => {
    if (mode === "tenant") router.replace("/dashboard");
  }, [mode, router]);

  if (mode === "tenant") return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-slate-500">Loading properties...</p>
      </div>
    );
  }

  const rooms = pgData.rooms;
  const occupiedRooms = rooms.filter((r) => r.status === "Occupied").length;
  const totalRooms = rooms.length;
  const monthlyRevenue = rooms.reduce((sum, r) => sum + r.rent, 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t("properties.title")}</h2>
          <p className="text-sm text-slate-500 mt-1">{t("properties.subtitle")}</p>
        </div>
        <Button variant="primary" size="sm" onPress={() => router.push("/setup?add=true")}>
          <Plus size={14} />
          {t("properties.addProperty")}
        </Button>
      </div>

      {properties.length === 0 ? (
        <div className="text-center py-16">
          <Building2 size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No property yet</h3>
          <p className="text-sm text-slate-500 mb-6">Add your first property to get started</p>
          <Button variant="primary" size="sm" onPress={() => router.push("/setup?add=true")}>
            <Plus size={14} />
            {t("properties.addProperty")}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {properties.map((p) => {
            const isActive = p.id === property?.id;
            return (
              <Card
                key={p.id}
                className={`card-hover stagger-item cursor-pointer transition-all ${isActive ? "ring-2 ring-blue-500/30 border-blue-200" : ""}`}
                onClick={() => { selectProperty(p.id); router.push("/dashboard"); }}
              >
                <Card.Content className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-2.5 rounded-xl ${isActive ? "bg-blue-50" : "bg-slate-50"}`}>
                      <Building2 size={20} className={isActive ? "text-blue-600" : "text-slate-400"} />
                    </div>
                    {isActive && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-[11px] font-medium rounded-full">
                        <Check size={10} /> Active
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-1">
                    {p.name}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-slate-500 mb-5">
                    <MapPin size={12} />
                    {p.address}
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">{t("properties.type")}</span>
                      <span className="font-medium text-slate-800">{p.type}</span>
                    </div>
                    {isActive && !pgData.loading && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">{t("properties.occupancy")}</span>
                          <span className="font-medium text-slate-800">
                            {occupiedRooms}/{totalRooms} {t("nav.rooms").toLowerCase()}
                          </span>
                        </div>
                        <ProgressBar value={totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0} minValue={0} maxValue={100} color="accent">
                          <ProgressBar.Track className="h-2 rounded-full bg-slate-100">
                            <ProgressBar.Fill className="h-2 rounded-full bg-blue-500" />
                          </ProgressBar.Track>
                        </ProgressBar>
                        <div className="flex justify-between text-sm pt-1">
                          <span className="text-slate-500">{t("properties.monthlyRevenue")}</span>
                          <span className="font-semibold text-slate-900">{`₹${monthlyRevenue.toLocaleString("en-IN")}`}</span>
                        </div>
                      </>
                    )}
                    {isActive && pgData.loading && (
                      <p className="text-xs text-slate-400">Loading stats...</p>
                    )}
                  </div>
                </Card.Content>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
