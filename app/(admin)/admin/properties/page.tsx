"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { adminFetch } from "@/lib/admin-api";

interface PropertyRow {
  id: string;
  name: string;
  address: string;
  type: string;
  total_rooms: number;
  verification_status: string;
  created_at: string;
  tenantCount: number;
  roomCount: number;
  owner: { email?: string; name?: string } | null;
}

function PropertiesContent() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") || "all";
  const [status, setStatus] = useState(initialStatus);
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async (s = status) => {
    setLoading(true);
    const res = await adminFetch<{ properties: PropertyRow[] }>(
      `/api/admin/properties?status=${encodeURIComponent(s)}`
    );
    if (res.error) setError(res.error);
    else setProperties(res.data?.properties || []);
    setLoading(false);
  };

  useEffect(() => {
    load(status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const updateStatus = async (id: string, verification_status: string) => {
    setBusyId(id);
    const res = await adminFetch("/api/admin/properties", {
      method: "PATCH",
      body: JSON.stringify({ id, verification_status }),
    });
    setBusyId(null);
    if (res.error) {
      setError(res.error);
      return;
    }
    await load();
  };

  const removeProperty = async (id: string, name: string) => {
    if (!confirm(`Delete property "${name}" and all related data?`)) return;
    setBusyId(id);
    const res = await adminFetch(`/api/admin/properties?id=${id}`, { method: "DELETE" });
    setBusyId(null);
    if (res.error) {
      setError(res.error);
      return;
    }
    await load();
  };

  const statusChip = (s: string) => {
    const styles: Record<string, string> = {
      verified: "bg-emerald-50 text-emerald-700",
      pending: "bg-amber-50 text-amber-700",
      rejected: "bg-rose-50 text-rose-700",
    };
    return styles[s] || "bg-slate-100 text-slate-600";
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">All properties</h1>
          <p className="text-sm text-slate-500 mt-1">Review, verify, and manage every PG on the platform</p>
        </div>
        <div className="flex gap-2">
          {["all", "pending", "verified", "rejected"].map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${
                status === s ? "bg-violet-600 text-white" : "bg-white border border-slate-200 text-slate-600"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Property</th>
                <th className="text-left px-4 py-3 font-semibold">Owner</th>
                <th className="text-left px-4 py-3 font-semibold">Rooms / Tenants</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-right px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500">Loading…</td>
                </tr>
              ) : properties.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500">No properties found</td>
                </tr>
              ) : (
                properties.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.type} · {p.address || "No address"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-800">{p.owner?.name || "—"}</p>
                      <p className="text-xs text-slate-500">{p.owner?.email || ""}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {p.roomCount} rooms · {p.tenantCount} tenants
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusChip(p.verification_status)}`}>
                        {p.verification_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {p.verification_status !== "verified" && (
                          <button
                            disabled={busyId === p.id}
                            onClick={() => updateStatus(p.id, "verified")}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                          >
                            Verify
                          </button>
                        )}
                        {p.verification_status !== "rejected" && (
                          <button
                            disabled={busyId === p.id}
                            onClick={() => updateStatus(p.id, "rejected")}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        )}
                        <button
                          disabled={busyId === p.id}
                          onClick={() => removeProperty(p.id, p.name)}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function AdminPropertiesPage() {
  return (
    <Suspense fallback={<div className="py-24 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" /></div>}>
      <PropertiesContent />
    </Suspense>
  );
}
