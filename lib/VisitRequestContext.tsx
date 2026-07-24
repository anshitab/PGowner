"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "./supabase";
import { usePropertyContext } from "./PropertyContext";

export interface VisitRequest {
  id: string;
  name: string;
  phone: string;
  date: string;
  purpose: string;
  message: string;
  status: "pending" | "approved" | "declined";
  createdAt: string;
}

interface VisitRequestContextType {
  requests: VisitRequest[];
  loading: boolean;
  addRequest: (req: Omit<VisitRequest, "id" | "status" | "createdAt">) => Promise<void>;
  updateStatus: (id: string, status: "approved" | "declined") => Promise<void>;
  refetch: () => Promise<void>;
}

const VisitRequestContext = createContext<VisitRequestContextType>({
  requests: [],
  loading: true,
  addRequest: async () => {},
  updateStatus: async () => {},
  refetch: async () => {},
});

export function VisitRequestProvider({ children }: { children: ReactNode }) {
  const { propertyId } = usePropertyContext();
  const [requests, setRequests] = useState<VisitRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    if (!propertyId) {
      setRequests([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("visitors")
      .select("*")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false });

    if (data) {
      setRequests(data.map((r) => ({
        id: r.id,
        name: r.name,
        phone: "",
        date: r.check_in?.split("T")[0] || "",
        purpose: r.purpose || "",
        message: "",
        status: r.status === "Inside" ? "approved" as const : r.status === "Checked Out" ? "approved" as const : "pending" as const,
        createdAt: r.created_at?.split("T")[0] || "",
      })));
    }
    setLoading(false);
  }, [propertyId]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const addRequest = useCallback(async (req: Omit<VisitRequest, "id" | "status" | "createdAt">) => {
    if (!propertyId) return;

    const { data } = await supabase
      .from("visitors")
      .insert({
        property_id: propertyId,
        tenant_id: null,
        name: req.name,
        purpose: req.purpose,
        status: "pending",
      })
      .select()
      .single();

    if (data) {
      setRequests((prev) => [{
        id: data.id,
        name: req.name,
        phone: req.phone,
        date: req.date,
        purpose: req.purpose,
        message: req.message,
        status: "pending" as const,
        createdAt: new Date().toISOString().split("T")[0],
      }, ...prev]);
    }
  }, [propertyId]);

  const updateStatus = useCallback(async (id: string, status: "approved" | "declined") => {
    const dbStatus = status === "approved" ? "Inside" : "Declined";
    await supabase.from("visitors").update({ status: dbStatus }).eq("id", id);
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  }, []);

  return (
    <VisitRequestContext.Provider value={{ requests, loading, addRequest, updateStatus, refetch: fetchRequests }}>
      {children}
    </VisitRequestContext.Provider>
  );
}

export function useVisitRequests() {
  return useContext(VisitRequestContext);
}
