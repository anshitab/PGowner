"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./AuthContext";

const STORAGE_KEY = "pgowner_selected_property_id";

export interface Property {
  id: string;
  owner_id: string;
  name: string;
  address: string;
  type: string;
  total_floors: number;
  total_rooms: number;
  rules: string[];
  verification_status: "pending" | "verified" | "rejected";
  verification_doc_url: string | null;
  created_at: string;
}

interface PropertyContextType {
  property: Property | null;
  properties: Property[];
  propertyId: string | null;
  loading: boolean;
  selectProperty: (id: string) => void;
  refetch: () => Promise<void>;
  createProperty: (props: Omit<Property, "id" | "owner_id" | "created_at">) => Promise<Property | null>;
  deleteProperty: (id: string) => Promise<boolean>;
}

const PropertyContext = createContext<PropertyContextType>({
  property: null,
  properties: [],
  propertyId: null,
  loading: true,
  selectProperty: () => {},
  refetch: async () => {},
  createProperty: async () => null,
  deleteProperty: async () => false,
});

export function PropertyProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  const selectProperty = useCallback((id: string) => {
    const found = properties.find((p) => p.id === id);
    if (found) {
      setProperty(found);
      localStorage.setItem(STORAGE_KEY, id);
    }
  }, [properties]);

  const fetchProperty = useCallback(async () => {
    if (!user) {
      setProperty(null);
      setProperties([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    if (user.role === "tenant") {
      const { data: tenant } = await supabase
        .from("tenants")
        .select("property_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (tenant?.property_id) {
        const { data: prop } = await supabase
          .from("properties")
          .select("*")
          .eq("id", tenant.property_id)
          .single();
        setProperty(prop || null);
        setProperties(prop ? [prop] : []);
      } else {
        setProperty(null);
        setProperties([]);
      }
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true });

    if (!error && data && data.length > 0) {
      setProperties(data);
      const storedId = localStorage.getItem(STORAGE_KEY);
      const selected = data.find((p) => p.id === storedId) || data[0];
      setProperty(selected);
      localStorage.setItem(STORAGE_KEY, selected.id);
    } else {
      setProperty(null);
      setProperties([]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }
    if (isAuthenticated) {
      void fetchProperty();
    } else {
      setProperty(null);
      setProperties([]);
      setLoading(false);
    }
  }, [authLoading, isAuthenticated, fetchProperty]);

  const createProperty = useCallback(async (props: Omit<Property, "id" | "owner_id" | "created_at">) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from("properties")
      .insert({ ...props, owner_id: user.id })
      .select()
      .single();

    if (!error && data) {
      setProperties((prev) => [...prev, data]);
      setProperty(data);
      localStorage.setItem(STORAGE_KEY, data.id);
      return data as Property;
    }
    return null;
  }, [user]);

  const deleteProperty = useCallback(async (id: string) => {
    const { error } = await supabase.from("properties").delete().eq("id", id);
    if (error) return false;

    const remaining = properties.filter((p) => p.id !== id);
    setProperties(remaining);
    if (property?.id === id) {
      const next = remaining[0] || null;
      setProperty(next);
      if (next) localStorage.setItem(STORAGE_KEY, next.id);
      else localStorage.removeItem(STORAGE_KEY);
    }
    return true;
  }, [properties, property]);

  return (
    <PropertyContext.Provider value={{ property, properties, propertyId: property?.id || null, loading, selectProperty, refetch: fetchProperty, createProperty, deleteProperty }}>
      {children}
    </PropertyContext.Provider>
  );
}

export const usePropertyContext = () => useContext(PropertyContext);
