"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-api";

interface ComplaintRow {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  createdAt: string;
  propertyName: string;
  tenantName: string;
}

export default function AdminComplaintsPage() {
  const [complaints, setComplaints] = useState<ComplaintRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await adminFetch<{ complaints: ComplaintRow[] }>("/api/admin/complaints");
    if (res.error) setError(res.error);
    else setComplaints(res.data?.complaints || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    setBusyId(id);
    const res = await adminFetch("/api/admin/complaints", {
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
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Complaints</h1>
        <p className="text-sm text-slate-500 mt-1">Monitor and update issues across all PGs</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Complaint</th>
                <th className="text-left px-4 py-3 font-semibold">Property / Tenant</th>
                <th className="text-left px-4 py-3 font-semibold">Priority</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-right px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">Loading…</td></tr>
              ) : complaints.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">No complaints</td></tr>
              ) : (
                complaints.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{c.title}</p>
                      <p className="text-xs text-slate-500 line-clamp-1">{c.description}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-800">{c.propertyName}</p>
                      <p className="text-xs text-slate-500">{c.tenantName}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${
                        c.priority === "High" ? "text-rose-600" : c.priority === "Medium" ? "text-amber-600" : "text-slate-600"
                      }`}>
                        {c.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {c.status !== "In Progress" && c.status !== "Resolved" && (
                          <button
                            disabled={busyId === c.id}
                            onClick={() => updateStatus(c.id, "In Progress")}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                          >
                            In progress
                          </button>
                        )}
                        {c.status !== "Resolved" && (
                          <button
                            disabled={busyId === c.id}
                            onClick={() => updateStatus(c.id, "Resolved")}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                          >
                            Resolve
                          </button>
                        )}
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
