"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-api";

interface OwnerRow {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  lastSignIn: string | null;
  propertyCount: number;
}

export default function AdminOwnersPage() {
  const [owners, setOwners] = useState<OwnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const res = await adminFetch<{ owners: OwnerRow[] }>("/api/admin/owners");
      if (res.error) setError(res.error);
      else setOwners(res.data?.owners || []);
      setLoading(false);
    })();
  }, []);

  const filtered = owners.filter(
    (o) =>
      !q ||
      o.name.toLowerCase().includes(q.toLowerCase()) ||
      o.email.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Owners</h1>
          <p className="text-sm text-slate-500 mt-1">All PG owner accounts on the platform</p>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search owners…"
          className="px-3.5 py-2 border border-slate-200 rounded-xl text-sm w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Owner</th>
                <th className="text-left px-4 py-3 font-semibold">Properties</th>
                <th className="text-left px-4 py-3 font-semibold">Joined</th>
                <th className="text-left px-4 py-3 font-semibold">Last sign-in</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-500">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-500">No owners found</td></tr>
              ) : (
                filtered.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{o.name}</p>
                      <p className="text-xs text-slate-500">{o.email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{o.propertyCount}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {o.lastSignIn
                        ? new Date(o.lastSignIn).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                        : "—"}
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
