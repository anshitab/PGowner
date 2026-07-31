"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Search, User } from "lucide-react";
import { Button } from "@heroui/react";
import { useBeds } from "@/lib/BedContext";
import { usePropertyContext } from "@/lib/PropertyContext";
import { supabase } from "@/lib/supabase";

interface Tenant {
  id: string;
  name: string;
  user_id: string | null;
}

interface Props {
  bedId: string;
  roomId: string;
  onClose: () => void;
}

export default function BedManagementModal({ bedId, roomId, onClose }: Props) {
  const [search, setSearch] = useState("");
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(true);
  const { assignBed, beds } = useBeds();
  const { propertyId } = usePropertyContext();

  useEffect(() => {
    async function fetchTenants() {
      if (!propertyId) {
        setTenants([]);
        setTenantsLoading(false);
        return;
      }

      const { data } = await supabase
        .from("tenants")
        .select("id, name, user_id")
        .eq("property_id", propertyId)
        .eq("status", "Active");

      if (data) {
        setTenants(data);
      }
      setTenantsLoading(false);
    }

    fetchTenants();
  }, [propertyId]);

  const assignedTenantNames = new Set(
    beds.filter((b) => b.status === "occupied" && b.tenantName).map((b) => b.tenantName)
  );

  const availableTenants = useMemo(() => {
    return tenants.filter((t) => !assignedTenantNames.has(t.name));
  }, [tenants, assignedTenantNames]);

  const filtered = useMemo(() => {
    if (!search.trim()) return availableTenants;
    const q = search.toLowerCase();
    return availableTenants.filter((t) => t.name.toLowerCase().includes(q));
  }, [search, availableTenants]);

  const handleAssign = () => {
    if (!selectedTenant) return;
    const tenant = tenants.find((t) => t.id === selectedTenant);
    if (!tenant) return;
    assignBed(bedId, tenant.id, tenant.name, tenant.user_id);
    onClose();
  };

  const bed = beds.find((b) => b.id === bedId);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Assign Tenant to Bed</h3>
            <p className="text-xs text-slate-500 mt-0.5">Bed {bed?.label} · Room {roomId}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={16} className="text-slate-500" />
          </button>
        </div>

        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tenants..."
              autoFocus
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {tenantsLoading ? (
            <p className="text-sm text-slate-400 text-center py-8">Loading tenants...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No available tenants found</p>
          ) : (
            filtered.map((tenant) => (
              <button
                key={tenant.id}
                onClick={() => setSelectedTenant(tenant.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left ${
                  selectedTenant === tenant.id
                    ? "bg-blue-50 border border-blue-200 shadow-sm"
                    : "hover:bg-slate-50 border border-transparent"
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700">
                  {tenant.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{tenant.name}</p>
                </div>
                {selectedTenant === tenant.id && (
                  <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                )}
              </button>
            ))
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <Button variant="ghost" size="sm" onPress={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" onPress={handleAssign} isDisabled={!selectedTenant}>
            <User size={14} />
            Assign Tenant
          </Button>
        </div>
      </div>
    </div>
  );
}
