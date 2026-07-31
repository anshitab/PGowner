"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { Building2, Search, MapPin, CheckCircle2, AlertCircle } from "lucide-react";

interface PropertyResult {
  id: string;
  name: string;
  address: string;
  type: string;
}

export default function TenantOnboardingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<PropertyResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPG, setSelectedPG] = useState<PropertyResult | null>(null);
  const [linkStatus, setLinkStatus] = useState<"idle" | "linking" | "linked" | "not_found">("idle");

  const handleSearch = async (query: string) => {
    setSearch(query);
    setSelectedPG(null);
    setLinkStatus("idle");

    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    setSearching(true);
    const { data } = await supabase
      .from("properties")
      .select("id, name, address, type")
      .eq("verification_status", "verified")
      .ilike("name", `%${query.trim()}%`)
      .limit(6);

    setResults(data || []);
    setSearching(false);
  };

  const handleSelectPG = async (pg: PropertyResult) => {
    setSelectedPG(pg);
    setResults([]);
    setSearch(pg.name);
    setLinkStatus("linking");

    if (!user?.email) {
      setLinkStatus("not_found");
      return;
    }

    // Check if owner has added this tenant by email in this property
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id")
      .eq("property_id", pg.id)
      .eq("email", user.email)
      .is("user_id", null)
      .maybeSingle();

    if (tenant) {
      // Link the tenant record
      await supabase
        .from("tenants")
        .update({ user_id: user.id })
        .eq("id", tenant.id);
      setLinkStatus("linked");
      setTimeout(() => router.replace("/dashboard"), 1500);
    } else {
      // Also check if already linked (user may have refreshed)
      const { data: alreadyLinked } = await supabase
        .from("tenants")
        .select("id")
        .eq("property_id", pg.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (alreadyLinked) {
        setLinkStatus("linked");
        setTimeout(() => router.replace("/dashboard"), 1500);
      } else {
        setLinkStatus("not_found");
      }
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-4">
            <Building2 size={28} className="text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome to ProManage!</h1>
          <p className="text-sm text-slate-500 mt-2">
            Search and select the PG you live in to access your tenant portal
          </p>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Which PG do you live in?
            </label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search by PG name..."
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
              />
              {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* Search Results */}
          {results.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
              {results.map((pg) => (
                <button
                  key={pg.id}
                  onClick={() => handleSelectPG(pg)}
                  className="w-full text-left px-4 py-3 hover:bg-indigo-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-blue-50 rounded-lg mt-0.5">
                      <Building2 size={14} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{pg.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin size={11} className="text-slate-400" />
                        <p className="text-xs text-slate-500">{pg.address}</p>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{pg.type}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {search.trim().length >= 2 && !searching && results.length === 0 && !selectedPG && (
            <p className="text-sm text-slate-400 text-center py-3">
              No verified PGs found matching "{search}"
            </p>
          )}

          {/* Link Status */}
          {linkStatus === "linking" && (
            <div className="flex items-center justify-center gap-2 py-4">
              <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-600">Checking your account...</p>
            </div>
          )}

          {linkStatus === "linked" && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center">
              <CheckCircle2 size={32} className="mx-auto text-emerald-600 mb-2" />
              <h3 className="text-base font-semibold text-emerald-800">You're all set!</h3>
              <p className="text-sm text-emerald-600 mt-1">
                Your account has been linked to {selectedPG?.name}. Redirecting to your dashboard...
              </p>
            </div>
          )}

          {linkStatus === "not_found" && selectedPG && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-amber-800">Not registered yet</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    Your PG owner hasn't added you to <strong>{selectedPG.name}</strong> yet.
                  </p>
                  <p className="text-sm text-amber-600 mt-2">
                    Ask your owner to add you using your email:
                  </p>
                  <p className="text-sm font-mono font-semibold text-amber-900 mt-1 bg-amber-100 rounded-lg px-3 py-1.5 inline-block">
                    {user?.email}
                  </p>
                  <p className="text-xs text-amber-500 mt-3">
                    Once they add you, come back and select your PG again.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Help text */}
        <div className="text-center">
          <p className="text-xs text-slate-400">
            Can't find your PG? It may not be registered on ProManage yet.
            <br />
            Ask your PG owner to sign up and add their property.
          </p>
        </div>
      </div>
    </div>
  );
}
