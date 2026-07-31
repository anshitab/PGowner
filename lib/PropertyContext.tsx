"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./AuthContext";

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
  propertyId: string | null;
  loading: boolean;
  refetch: () => Promise<void>;
  createProperty: (props: Omit<Property, "id" | "owner_id" | "created_at">) => Promise<Property | null>;
}

const PropertyContext = createContext<PropertyContextType>({
  property: null,
  propertyId: null,
  loading: true,
  refetch: async () => {},
  createProperty: async () => null,
});

export function PropertyProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProperty = useCallback(async () => {
    if (!user) {
      setProperty(null);
      setLoading(false);
      return;
    }

    if (user.role === "tenant") {
      // For tenants: find their linked tenant record, then fetch that property
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
      } else {
        setProperty(null);
      }
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .eq("owner_id", user.id)
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      setProperty(data);
    } else {
      setProperty(null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProperty();
    } else {
      setProperty(null);
      setLoading(false);
    }
  }, [isAuthenticated, fetchProperty]);

  const createProperty = useCallback(async (props: Omit<Property, "id" | "owner_id" | "created_at">) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from("properties")
      .insert({ ...props, owner_id: user.id })
      .select()
      .single();

    if (!error && data) {
      setProperty(data);
      return data as Property;
    }
    return null;
  }, [user]);

  return (
    <PropertyContext.Provider value={{ property, propertyId: property?.id || null, loading, refetch: fetchProperty, createProperty }}>
      {children}
    </PropertyContext.Provider>
  );
}

export const usePropertyContext = () => useContext(PropertyContext);
