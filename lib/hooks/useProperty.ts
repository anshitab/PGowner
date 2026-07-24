"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase";
import { useAuth } from "../AuthContext";

export interface Property {
  id: string;
  owner_id: string;
  name: string;
  address: string;
  type: string;
  total_floors: number;
  total_rooms: number;
  rules: string[];
  created_at: string;
}

export function useProperty() {
  const { user } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProperty = useCallback(async () => {
    if (!user) {
      setProperty(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .eq("owner_id", user.id)
      .limit(1)
      .single();

    if (!error && data) {
      setProperty(data);
    } else {
      setProperty(null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProperty();
  }, [fetchProperty]);

  const createProperty = useCallback(async (props: {
    name: string;
    address: string;
    type: string;
    total_floors: number;
    total_rooms: number;
    rules: string[];
  }) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from("properties")
      .insert({ ...props, owner_id: user.id })
      .select()
      .single();

    if (!error && data) {
      setProperty(data);
      return data;
    }
    return null;
  }, [user]);

  return { property, loading, refetch: fetchProperty, createProperty };
}
