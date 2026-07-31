"use client";

import { Plus, Search, Phone, Mail, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { Card, Chip, Button, Avatar, AvatarFallback, Modal, useOverlayState } from "@heroui/react";
import EmptyState from "@/components/EmptyState";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useUserMode } from "@/lib/UserModeContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePropertyContext } from "@/lib/PropertyContext";
import { supabase } from "@/lib/supabase";

interface Tenant {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: string;
  rent: number;
  join_date: string;
  rooms: { number: string } | null;
}

interface Room {
  id: string;
  number: string;
  rent: number;
  type: string;
}

export default function TenantsPage() {
  const [search, setSearch] = useState("");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const modalState = useOverlayState();
  const { t } = useLanguage();
  const { mode } = useUserMode();
  const router = useRouter();
  const { propertyId, property } = usePropertyContext();

  // Form state
  const [sharingFilter, setSharingFilter] = useState<string>("Single");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    aadhaar: "",
    emergencyContact: "",
    homeAddress: "",
    roomId: "",
    rent: "",
    deposit: "",
    occupation: "",
    joinDate: new Date().toISOString().split("T")[0],
  });
  const [aadhaarError, setAadhaarError] = useState("");

  useEffect(() => {
    if (mode === "tenant") router.replace("/dashboard");
  }, [mode, router]);

  const fetchTenants = async () => {
    if (!propertyId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("tenants")
      .select("*, rooms(number)")
      .eq("property_id", propertyId);
    if (!error && data) {
      setTenants(data as Tenant[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!propertyId) return;
    fetchTenants();

    const fetchRooms = async () => {
      const { data } = await supabase
        .from("rooms")
        .select("id, number, rent, type, beds(id, status)")
        .eq("property_id", propertyId)
        .order("number");
      if (data) {
        const available = data.filter((room) => {
          const beds = (room as { beds?: { id: string; status: string }[] }).beds || [];
          return beds.length === 0 || beds.some((b) => b.status === "available");
        });
        setRooms(available.map((r) => ({ id: r.id, number: r.number, rent: r.rent, type: r.type })));
      }
    };
    fetchRooms();
  }, [propertyId]);

  const validateAadhaar = (aadhaar: string): boolean => {
    const cleaned = aadhaar.replace(/\s/g, "");
    if (!/^\d{12}$/.test(cleaned)) return false;

    const d = [
      [0,1,2,3,4,5,6,7,8,9],
      [1,2,3,4,0,6,7,8,9,5],
      [2,3,4,0,1,7,8,9,5,6],
      [3,4,0,1,2,8,9,5,6,7],
      [4,0,1,2,3,9,5,6,7,8],
      [5,9,8,7,6,0,4,3,2,1],
      [6,5,9,8,7,1,0,4,3,2],
      [7,6,5,9,8,2,1,0,4,3],
      [8,7,6,5,9,3,2,1,0,4],
      [9,8,7,6,5,4,3,2,1,0],
    ];
    const p = [
      [0,1,2,3,4,5,6,7,8,9],
      [1,5,7,6,2,8,3,0,9,4],
      [5,8,0,3,7,9,6,1,4,2],
      [8,9,1,6,0,4,3,5,2,7],
      [9,4,5,3,1,2,6,8,7,0],
      [4,2,8,6,5,7,3,9,0,1],
      [2,7,9,3,8,0,6,4,1,5],
      [7,0,4,6,9,1,3,2,5,8],
    ];

    let c = 0;
    const digits = cleaned.split("").map(Number).reverse();
    for (let i = 0; i < digits.length; i++) {
      c = d[c][p[i % 8][digits[i]]];
    }
    return c === 0;
  };

  const handleAddTenant = async () => {
    setFormError("");
    setAadhaarError("");
    if (!form.name.trim()) { setFormError("Name is required"); return; }
    if (!form.phone.trim()) { setFormError("Phone is required"); return; }
    if (!form.aadhaar.trim()) { setFormError("Aadhaar number is required"); return; }
    if (!validateAadhaar(form.aadhaar)) { setAadhaarError("Invalid Aadhaar number"); setFormError("Please enter a valid Aadhaar number"); return; }
    if (!form.emergencyContact.trim()) { setFormError("Emergency contact is required"); return; }
    if (!form.homeAddress.trim()) { setFormError("Home address is required"); return; }
    if (!form.roomId) { setFormError("Please select a room"); return; }
    if (!propertyId) return;

    setSubmitting(true);
    const rent = parseInt(form.rent.replace(/[^\d]/g, "")) || 0;
    const deposit = parseInt(form.deposit.replace(/[^\d]/g, "")) || 0;

    const { data: tenantData, error } = await supabase.from("tenants").insert({
      property_id: propertyId,
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      gov_ids: { aadhaar: form.aadhaar.replace(/\s/g, "") },
      emergency_contact: { phone: form.emergencyContact.trim() },
      address: form.homeAddress.trim(),
      room_id: form.roomId,
      rent,
      deposit,
      occupation: form.occupation.trim(),
      join_date: form.joinDate,
      status: "Active",
    }).select().single();

    if (error) {
      setFormError(error.message);
    } else if (tenantData) {
      // Assign tenant to an available bed in the room
      const { data: availableBed } = await supabase
        .from("beds")
        .select("id")
        .eq("room_id", form.roomId)
        .eq("status", "available")
        .limit(1)
        .single();

      if (availableBed) {
        await supabase.from("beds").update({
          tenant_id: tenantData.user_id || null,
          tenant_name: form.name.trim(),
          status: "occupied",
          assigned_date: form.joinDate,
        }).eq("id", availableBed.id);

        await supabase.from("rooms").update({ status: "Occupied" }).eq("id", form.roomId);
        if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("rooms-updated"));
      }

      // Create first rent collection entry
      if (rent > 0) {
        const now = new Date();
        const dueDate = new Date(now.getFullYear(), now.getMonth(), 1);
        if (dueDate < now) dueDate.setMonth(dueDate.getMonth() + 1);

        await supabase.from("rent_collection").insert({
          property_id: propertyId,
          tenant_id: tenantData.id,
          amount: rent,
          due_date: dueDate.toISOString().split("T")[0],
          status: "Pending",
        });
      }

      // Create auth account and send credentials email if email provided
      if (form.email.trim()) {
        const selectedRoom = rooms.find((r: Room) => r.id === form.roomId);
        await fetch("/api/create-tenant-account", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenantName: form.name.trim(),
            tenantEmail: form.email.trim(),
            pgName: property?.name || "PG",
            roomNumber: selectedRoom?.number || "",
          }),
        });
      }

      setForm({ name: "", phone: "", email: "", aadhaar: "", emergencyContact: "", homeAddress: "", roomId: "", rent: "", deposit: "", occupation: "", joinDate: new Date().toISOString().split("T")[0] });
      modalState.close();
      await fetchTenants();
    }
    setSubmitting(false);
  };

  if (mode === "tenant") return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const filtered = tenants.filter(
    (tn) =>
      tn.name.toLowerCase().includes(search.toLowerCase()) ||
      (tn.rooms?.number || "").toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = tenants.filter((tn) => tn.status === "Active").length;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t("tenants.title")}</h2>
          <p className="text-sm text-slate-500 mt-1">
            {tenants.length} {t("common.total")} &middot; {activeCount} {t("status.active").toLowerCase()}
          </p>
        </div>
        <Button variant="primary" size="sm" onPress={() => modalState.open()}>
          <Plus size={14} />
          {t("tenants.addTenant")}
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder={t("tenants.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={t("tenants.noTenants")} description={t("tenants.noTenantsDesc")} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((tenant, i) => (
            <Link key={tenant.id} href={`/tenants/${tenant.id}`} className="block">
            <Card
              className="card-hover stagger-item cursor-pointer hover:ring-2 hover:ring-indigo-100"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <Card.Content className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Avatar size="sm">
                      <AvatarFallback>
                        {tenant.name.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">{tenant.name}</h4>
                      <p className="text-[11px] text-slate-500">
                        {t("common.room")} {tenant.rooms?.number || "—"}
                      </p>
                    </div>
                  </div>
                  <Chip size="sm" variant="soft" color={tenant.status === "Active" ? "success" : "default"}>
                    {tenant.status === "Active" ? t("status.active") : t("status.inactive")}
                  </Chip>
                </div>
                <div className="space-y-2 mt-4">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Phone size={12} className="text-slate-400" />
                    {tenant.phone}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Mail size={12} className="text-slate-400" />
                    {tenant.email}
                  </div>
                </div>
                <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100">
                  <span className="text-[11px] text-slate-500">
                    {t("tenants.joined")}{" "}
                    {new Date(tenant.join_date).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                  </span>
                  <span className="text-sm font-semibold text-slate-900">{`₹${tenant.rent.toLocaleString("en-IN")}`}/mo</span>
                </div>
              </Card.Content>
            </Card>
            </Link>
          ))}
        </div>
      )}

      {modalState.isOpen && (
        <Modal state={modalState}>
          <Modal.Backdrop variant="blur">
            <Modal.Container size="lg" placement="center">
              <Modal.Dialog aria-label="Add Tenant">
                <Modal.Header>
                  <Modal.Heading>{t("tenants.addNewTenant")}</Modal.Heading>
                </Modal.Header>
                <Modal.Body>
                  <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
                    {formError && (
                      <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{formError}</p>
                    )}

                    <p className="text-xs text-slate-500"><span className="text-red-500">*</span> indicates mandatory fields</p>

                    {/* Personal Information */}
                    <fieldset className="space-y-4">
                      <legend className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Personal Information</legend>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            {t("tenants.fullName")} <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="Enter name"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            {t("tenants.phone")} <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="tel"
                            placeholder="+91 XXXXX XXXXX"
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">{t("tenants.email")}</label>
                          <input
                            type="email"
                            placeholder="email@example.com"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Occupation</label>
                          <input
                            type="text"
                            placeholder="e.g., Software Engineer"
                            value={form.occupation}
                            onChange={(e) => setForm({ ...form, occupation: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </fieldset>

                    <hr className="border-slate-100" />

                    {/* Identity & Emergency */}
                    <fieldset className="space-y-4">
                      <legend className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Identity & Emergency</legend>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Aadhaar Number <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="XXXX XXXX XXXX"
                              maxLength={14}
                              value={form.aadhaar}
                              onChange={(e) => {
                                const raw = e.target.value.replace(/[^\d]/g, "").slice(0, 12);
                                const formatted = raw.replace(/(\d{4})(?=\d)/g, "$1 ");
                                setForm({ ...form, aadhaar: formatted });
                                setAadhaarError("");
                              }}
                              className={`w-full px-3 py-2 pr-9 bg-slate-50 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${aadhaarError ? "border-red-300 bg-red-50/50" : validateAadhaar(form.aadhaar) ? "border-emerald-300 bg-emerald-50/30" : "border-slate-200"}`}
                            />
                            {validateAadhaar(form.aadhaar) && (
                              <CheckCircle size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" />
                            )}
                          </div>
                          {aadhaarError && <p className="text-xs text-red-500 mt-1">{aadhaarError}</p>}
                          {validateAadhaar(form.aadhaar) && !aadhaarError && (
                            <p className="text-xs text-emerald-600 mt-1">Aadhaar verified</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Emergency Contact <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="tel"
                            placeholder="+91 XXXXX XXXXX"
                            value={form.emergencyContact}
                            onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Home Address <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          placeholder="Full permanent address"
                          rows={2}
                          value={form.homeAddress}
                          onChange={(e) => setForm({ ...form, homeAddress: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                        />
                      </div>
                    </fieldset>

                    <hr className="border-slate-100" />

                    {/* Room & Payment */}
                    <fieldset className="space-y-4">
                      <legend className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Room & Payment</legend>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Sharing Type</label>
                          <select
                            value={sharingFilter}
                            onChange={(e) => { setSharingFilter(e.target.value); setForm({ ...form, roomId: "", rent: "" }); }}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          >
                            <option value="Single">Single Sharing</option>
                            <option value="Double">Double Sharing</option>
                            <option value="Triple">Triple Sharing</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            {t("common.room")} <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={form.roomId}
                            onChange={(e) => {
                              const room = rooms.find((r) => r.id === e.target.value);
                              setForm({ ...form, roomId: e.target.value, rent: room ? `₹${room.rent.toLocaleString("en-IN")}` : form.rent });
                            }}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          >
                            <option value="">Select room</option>
                            {rooms
                              .filter((room) => room.type === sharingFilter)
                              .map((room) => (
                                <option key={room.id} value={room.id}>
                                  {room.number}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">{t("tenants.monthlyRent")}</label>
                          <input
                            type="text"
                            placeholder="₹12,000"
                            value={form.rent}
                            onChange={(e) => setForm({ ...form, rent: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Security Deposit</label>
                          <input
                            type="text"
                            placeholder="₹24,000"
                            value={form.deposit}
                            onChange={(e) => setForm({ ...form, deposit: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Join Date <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            value={form.joinDate}
                            onChange={(e) => setForm({ ...form, joinDate: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </fieldset>
                  </div>
                </Modal.Body>
                <Modal.Footer className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onPress={() => modalState.close()}>{t("common.cancel")}</Button>
                  <Button variant="primary" size="sm" isDisabled={submitting} onPress={handleAddTenant}>
                    {submitting ? "Adding..." : t("tenants.addTenant")}
                  </Button>
                </Modal.Footer>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      )}
    </div>
  );
}
