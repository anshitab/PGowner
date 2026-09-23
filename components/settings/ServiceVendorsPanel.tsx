"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Phone, Wrench } from "lucide-react";
import { Button } from "@heroui/react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { usePropertyContext } from "@/lib/PropertyContext";
import { SERVICE_TRADES, TRADE_LABELS, type ServiceTrade } from "@/lib/service-trades";

interface VendorRow {
  id: string;
  trade: ServiceTrade;
  name: string;
  phone: string;
  email: string;
  is_active: boolean;
}

export default function ServiceVendorsPanel() {
  const { propertyId } = usePropertyContext();
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    trade: "plumbing" as ServiceTrade,
    name: "",
    phone: "",
    email: "",
  });

  const loadVendors = useCallback(async () => {
    if (!propertyId) return;
    setLoading(true);
    const res = await fetch(`/api/service-vendors?property_id=${propertyId}`);
    const data = await res.json();
    setVendors(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [propertyId]);

  useEffect(() => {
    void loadVendors();
  }, [loadVendors]);

  const authFetch = async (url: string, init: RequestInit) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error("Please sign in again");
    return fetch(url, {
      ...init,
      headers: {
        ...(init.headers || {}),
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
  };

  const handleAdd = async () => {
    if (!propertyId || !form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    try {
      const res = await authFetch("/api/service-vendors", {
        method: "POST",
        body: JSON.stringify({ propertyId, ...form, name: form.name.trim() }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error || "Failed to add contact");
        return;
      }
      setForm({ trade: "plumbing", name: "", phone: "", email: "" });
      await loadVendors();
      toast.success("Service contact added");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add contact");
    }
  };

  const handleDelete = async (id: string) => {
    if (!propertyId) return;
    try {
      const res = await authFetch(
        `/api/service-vendors?id=${id}&property_id=${propertyId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const body = await res.json();
        toast.error(body.error || "Failed to remove contact");
        return;
      }
      await loadVendors();
      toast.success("Contact removed");
    } catch {
      toast.error("Failed to remove contact");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
          <Wrench size={16} />
          Service contacts
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          When you approve a tenant complaint, ProManage assigns the matching trade (plumber, electrician, etc.) and notifies them by email if configured.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 p-4 rounded-lg border border-slate-200 bg-slate-50/80">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Trade</label>
          <select
            value={form.trade}
            onChange={(e) => setForm({ ...form, trade: e.target.value as ServiceTrade })}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
          >
            {SERVICE_TRADES.map((t) => (
              <option key={t} value={t}>
                {TRADE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g., Ramesh Kumar"
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+91 …"
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Email (for job alerts)</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="vendor@example.com"
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <Button variant="primary" size="sm" onPress={handleAdd}>
            <Plus size={14} />
            Add contact
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading contacts…</p>
      ) : vendors.length === 0 ? (
        <p className="text-sm text-slate-500 rounded-lg border border-dashed border-slate-200 p-4">
          No service contacts yet. Add at least a plumber and electrician so complaints can be auto-assigned after approval.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {vendors.map((v) => (
            <li key={v.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">{v.name}</p>
                <p className="text-xs text-slate-500">{TRADE_LABELS[v.trade]}</p>
                {(v.phone || v.email) && (
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                    <Phone size={11} />
                    {[v.phone, v.email].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleDelete(v.id)}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
