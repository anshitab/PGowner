"use client";

import { usePropertyContext } from "@/lib/PropertyContext";
import { usePGData } from "@/lib/usePGData";
import { Building2, Plus, MapPin, Shield, ShieldCheck, ShieldX } from "lucide-react";
import { Card, Chip, Button, Modal, ProgressBar, useOverlayState } from "@heroui/react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useUserMode } from "@/lib/UserModeContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import VerificationStep from "@/components/setup/VerificationStep";

export default function PropertiesPage() {
  const modalState = useOverlayState();
  const { t } = useLanguage();
  const { mode } = useUserMode();
  const router = useRouter();
  const { property, loading, refetch } = usePropertyContext();
  const pgData = usePGData();
  const [showVerifyModal, setShowVerifyModal] = useState(false);

  useEffect(() => {
    if (mode === "tenant") router.replace("/dashboard");
  }, [mode, router]);

  if (mode === "tenant") return null;

  if (loading || pgData.loading) {
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
        <Button variant="primary" size="sm" onPress={() => modalState.open()}>
          <Plus size={14} />
          {t("properties.addProperty")}
        </Button>
      </div>

      {!property ? (
        <div className="text-center py-16">
          <Building2 size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No property yet</h3>
          <p className="text-sm text-slate-500 mb-6">Add your first property to get started</p>
          <Button variant="primary" size="sm" onPress={() => modalState.open()}>
            <Plus size={14} />
            {t("properties.addProperty")}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <Card className="card-hover stagger-item">
            <Card.Content className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 bg-blue-50 rounded-xl">
                  <Building2 size={20} className="text-blue-600" />
                </div>
                <div className="flex items-center gap-2">
                  {property.verification_status === "verified" ? (
                    <Chip size="sm" variant="soft" color="success">
                      <ShieldCheck size={11} className="mr-1" />
                      Verified
                    </Chip>
                  ) : property.verification_status === "rejected" ? (
                    <Chip size="sm" variant="soft" color="danger">
                      <ShieldX size={11} className="mr-1" />
                      Rejected
                    </Chip>
                  ) : (
                    <Chip size="sm" variant="soft" color="warning">
                      <Shield size={11} className="mr-1" />
                      Pending
                    </Chip>
                  )}
                </div>
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-1">
                {property.name}
              </h3>
              <div className="flex items-center gap-1 text-xs text-slate-500 mb-5">
                <MapPin size={12} />
                {property.address}
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{t("properties.type")}</span>
                  <span className="font-medium text-slate-800">{property.type}</span>
                </div>
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
              </div>
              {property.verification_status !== "verified" && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onPress={() => setShowVerifyModal(true)}
                  >
                    <Shield size={14} />
                    Verify Property
                  </Button>
                  <p className="text-[10px] text-slate-400 mt-1.5 text-center">
                    Upload a document to make your PG visible to visitors
                  </p>
                </div>
              )}
            </Card.Content>
          </Card>
        </div>
      )}

      {modalState.isOpen && (
        <Modal state={modalState}>
          <Modal.Backdrop isDismissable variant="blur" onClick={() => modalState.close()}>
            <Modal.Container size="md" placement="center">
              <Modal.Dialog aria-label="Add Property">
                <Modal.Header>
                  <Modal.Heading>{t("properties.addNewProperty")}</Modal.Heading>
                </Modal.Header>
                <Modal.Body>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        {t("properties.propertyName")}
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Sunrise Residency"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        {t("properties.address")}
                      </label>
                      <input
                        type="text"
                        placeholder="Full address"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          {t("properties.type")}
                        </label>
                        <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                          <option>PG/Hostel</option>
                          <option>Apartment</option>
                          <option>Villa</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          {t("properties.totalRooms")}
                        </label>
                        <input
                          type="number"
                          placeholder="e.g., 50"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </Modal.Body>
                <Modal.Footer className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onPress={() => modalState.close()}>
                    {t("common.cancel")}
                  </Button>
                  <Button variant="primary" size="sm" onPress={() => modalState.close()}>
                    {t("properties.addProperty")}
                  </Button>
                </Modal.Footer>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      )}

      {showVerifyModal && property && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowVerifyModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto p-6">
            <VerificationStep
              propertyId={property.id}
              onComplete={() => { setShowVerifyModal(false); refetch(); }}
              onSkip={() => setShowVerifyModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
