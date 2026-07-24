"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, DoorOpen, CreditCard, MessageSquareWarning, ArrowRight, Command } from "lucide-react";
import { usePropertyContext } from "@/lib/PropertyContext";
import { usePGData } from "@/lib/usePGData";
import { useComplaints } from "@/lib/ComplaintContext";
import { supabase } from "@/lib/supabase";

interface SearchResult {
  id: string;
  type: "tenant" | "room" | "payment" | "complaint" | "action";
  title: string;
  subtitle: string;
  href?: string;
}

const quickActions: SearchResult[] = [
  { id: "action-tenants", type: "action", title: "View All Tenants", subtitle: "Navigate to tenants list", href: "/tenants" },
  { id: "action-rooms", type: "action", title: "View All Rooms", subtitle: "Navigate to rooms list", href: "/rooms" },
  { id: "action-payments", type: "action", title: "View Payments", subtitle: "Navigate to payments", href: "/payments" },
  { id: "action-settings", type: "action", title: "Open Settings", subtitle: "Navigate to settings", href: "/settings" },
  { id: "action-activity", type: "action", title: "Activity Center", subtitle: "View recent activity", href: "/activity" },
  { id: "action-reports", type: "action", title: "Reports", subtitle: "View analytics & reports", href: "/reports" },
];

const typeIcons: Record<string, typeof Search> = {
  tenant: Users,
  room: DoorOpen,
  payment: CreditCard,
  complaint: MessageSquareWarning,
  action: ArrowRight,
};

const typeLabels: Record<string, string> = {
  tenant: "Tenants",
  room: "Rooms",
  payment: "Payments",
  complaint: "Complaints",
  action: "Quick Actions",
};

interface TenantSearchItem {
  id: string;
  name: string;
  phone: string;
  room: string;
}

interface PaymentSearchItem {
  id: string;
  tenant: string;
  amount: number;
  date: string;
  method: string;
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [tenants, setTenants] = useState<TenantSearchItem[]>([]);
  const [payments, setPayments] = useState<PaymentSearchItem[]>([]);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { propertyId } = usePropertyContext();
  const { rooms } = usePGData();
  const { complaints } = useComplaints();

  // Fetch tenants and payments when palette opens
  useEffect(() => {
    if (!open || !propertyId) return;

    async function fetchSearchData() {
      const [tenantsRes, paymentsRes] = await Promise.all([
        supabase
          .from("tenants")
          .select("id, name, phone, rooms(number)")
          .eq("property_id", propertyId!)
          .limit(50),
        supabase
          .from("payments")
          .select("id, amount, date, method, tenants(name)")
          .eq("property_id", propertyId!)
          .order("date", { ascending: false })
          .limit(20),
      ]);

      if (tenantsRes.data) {
        setTenants(
          tenantsRes.data.map((t: Record<string, unknown>) => ({
            id: t.id as string,
            name: (t.name as string) || "",
            phone: (t.phone as string) || "",
            room: ((t.rooms as { number: string } | null)?.number) || "",
          }))
        );
      }

      if (paymentsRes.data) {
        setPayments(
          paymentsRes.data.map((p: Record<string, unknown>) => ({
            id: p.id as string,
            tenant: ((p.tenants as { name: string } | null)?.name) || "",
            amount: (p.amount as number) || 0,
            date: (p.date as string) || "",
            method: (p.method as string) || "",
          }))
        );
      }
    }

    fetchSearchData();
  }, [open, propertyId]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const results = useMemo((): SearchResult[] => {
    if (!query.trim()) return quickActions;
    const q = query.toLowerCase();

    const tenantResults: SearchResult[] = tenants
      .filter((t) => t.name.toLowerCase().includes(q) || t.room.toLowerCase().includes(q) || t.phone.includes(q))
      .slice(0, 5)
      .map((t) => ({ id: `t-${t.id}`, type: "tenant", title: t.name, subtitle: `Room ${t.room} · ${t.phone}`, href: `/tenants/${t.id}` }));

    const roomResults: SearchResult[] = rooms
      .filter((r) => r.number.toLowerCase().includes(q) || r.type.toLowerCase().includes(q))
      .slice(0, 5)
      .map((r) => ({ id: `r-${r.id}`, type: "room", title: `Room ${r.number}`, subtitle: `${r.type} · Floor ${r.floor} · ${r.status}`, href: "/rooms" }));

    const paymentResults: SearchResult[] = payments
      .filter((p) => p.tenant.toLowerCase().includes(q) || `₹${p.amount.toLocaleString("en-IN")}`.toLowerCase().includes(q))
      .slice(0, 3)
      .map((p) => ({ id: `p-${p.id}`, type: "payment", title: `${p.tenant} - ₹${p.amount.toLocaleString("en-IN")}`, subtitle: `${p.date} · ${p.method}`, href: "/payments" }));

    const complaintResults: SearchResult[] = complaints
      .filter((c) => c.title.toLowerCase().includes(q) || c.tenant.toLowerCase().includes(q))
      .slice(0, 3)
      .map((c) => ({ id: `c-${c.id}`, type: "complaint", title: c.title, subtitle: `${c.tenant} · ${c.status}`, href: "/complaints" }));

    const actionResults = quickActions.filter((a) => a.title.toLowerCase().includes(q));

    return [...tenantResults, ...roomResults, ...paymentResults, ...complaintResults, ...actionResults];
  }, [query, tenants, rooms, payments, complaints]);

  const grouped = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    results.forEach((r) => {
      if (!groups[r.type]) groups[r.type] = [];
      groups[r.type].push(r);
    });
    return groups;
  }, [results]);

  const flatResults = results;

  const handleSelect = useCallback((result: SearchResult) => {
    setOpen(false);
    if (result.href) router.push(result.href);
  }, [router]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, flatResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && flatResults[selectedIndex]) {
      e.preventDefault();
      handleSelect(flatResults[selectedIndex]);
    }
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
          <Search size={18} className="text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search tenants, rooms, payments..."
            className="flex-1 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none bg-transparent"
          />
          <kbd className="hidden sm:flex items-center gap-0.5 px-2 py-1 text-[10px] font-medium text-slate-400 bg-slate-50 border border-slate-200 rounded-md">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto">
          {flatResults.length === 0 ? (
            <div className="py-12 text-center">
              <Search size={32} className="mx-auto text-slate-200 mb-2" />
              <p className="text-sm text-slate-400">No results found for &ldquo;{query}&rdquo;</p>
            </div>
          ) : (
            <div className="py-2">
              {Object.entries(grouped).map(([type, items]) => (
                <div key={type}>
                  <p className="px-5 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    {typeLabels[type] || type}
                  </p>
                  {items.map((item) => {
                    const globalIdx = flatResults.indexOf(item);
                    const Icon = typeIcons[item.type] || Search;
                    return (
                      <button
                        key={item.id}
                        data-index={globalIdx}
                        onClick={() => handleSelect(item)}
                        className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors ${
                          globalIdx === selectedIndex ? "bg-blue-50" : "hover:bg-slate-50"
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          globalIdx === selectedIndex ? "bg-blue-100" : "bg-slate-100"
                        }`}>
                          <Icon size={14} className={globalIdx === selectedIndex ? "text-blue-600" : "text-slate-500"} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{item.title}</p>
                          <p className="text-[11px] text-slate-500 truncate">{item.subtitle}</p>
                        </div>
                        {globalIdx === selectedIndex && (
                          <kbd className="text-[10px] font-medium text-blue-500 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                            ↵
                          </kbd>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-slate-100 rounded text-[10px]">↑↓</kbd> Navigate</span>
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-slate-100 rounded text-[10px]">↵</kbd> Select</span>
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-slate-100 rounded text-[10px]">esc</kbd> Close</span>
          </div>
          <div className="flex items-center gap-1">
            <Command size={11} />
            <span>K to toggle</span>
          </div>
        </div>
      </div>
    </div>
  );
}
