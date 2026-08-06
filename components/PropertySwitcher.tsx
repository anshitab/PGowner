"use client";

import { usePropertyContext } from "@/lib/PropertyContext";
import { ChevronDown, Building2, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export default function PropertySwitcher() {
  const { property, properties, selectProperty } = usePropertyContext();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (properties.length <= 1) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
      >
        <Building2 size={14} className="text-slate-500" />
        <span className="text-sm font-medium text-slate-700 truncate max-w-[140px]">
          {property?.name}
        </span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1">
          {properties.map((p) => (
            <button
              key={p.id}
              onClick={() => { selectProperty(p.id); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-slate-50 transition-colors ${
                p.id === property?.id ? "bg-blue-50 text-blue-700" : "text-slate-700"
              }`}
            >
              <span className="truncate">{p.name}</span>
              {p.id === property?.id && <Check size={14} className="text-blue-600 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
