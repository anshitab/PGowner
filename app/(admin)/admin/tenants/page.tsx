"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-api";

interface TenantRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  rent: number;
  status: string;
  joinDate: string;
  propertyName: string;
  roomNumber: string;
}

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async (query = q) => {
    setLoading(true);
    const res = await adminFetch<{ tenants: TenantRow[] }>(
      `/api/admin/tenants?q=${encodeURIComponent(query)}`
    );
    if (res.error) setError(res.error);
    else setTenants(res.data?.tenants || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateStatus = async (id: string, status: string) => {
    setBusyId(id);
    const res = await adminFetch("/api/admin/tenants", {
      method: "PATCH",
      body: JSON.stringify({ id, status }),
    });
    setBusyId(null);
    if (res.error) {
      setError(res.error);
      return;
    }
    await load();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tenants</h1>
          <p className="text-sm text-slate-500 mt-1">Cross-property tenant directory</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(q)}
            placeholder="Search name, email, PG…"
            className="px-3.5 py-2 border border-slate-200 rounded-xl text-sm flex-1 sm:w-72 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
          />
          <button
            onClick={() => load(q)}
            className="px-3.5 py-2 rounded-xl text-sm font-medium bg-violet-600 text-white hover:bg-violet-700"
          >
            Search
          </button>
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
                <th className="text-left px-4 py-3 font-semibold">Tenant</th>
                <th className="text-left px-4 py-3 font-semibold">Property / Room</th>
                <th className="text-left px-4 py-3 font-semibold">Rent</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-right px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">Loading…</td></tr>
              ) : tenants.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">No tenants found</td></tr>
              ) : (
                tenants.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{t.name}</p>
                      <p className="text-xs text-slate-500">{t.email || t.phone || "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-800">{t.propertyName}</p>
                      <p className="text-xs text-slate-500">Room {t.roomNumber}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">₹{(t.rent || 0).toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        t.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {t.status === "Active" ? (
                        <button
                          disabled={busyId === t.id}
                          onClick={() => updateStatus(t.id, "Inactive")}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          disabled={busyId === t.id}
                          onClick={() => updateStatus(t.id, "Active")}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                        >
                          Activate
                        </button>
                      )}
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
