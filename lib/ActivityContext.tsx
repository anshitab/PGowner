"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "./supabase";
import { usePropertyContext } from "./PropertyContext";
import { ActivityEvent } from "./activity-logger";

interface ActivityContextType {
  activities: ActivityEvent[];
  loading: boolean;
  filteredActivities: (type?: string) => ActivityEvent[];
  clearAll: () => void;
  refetch: () => Promise<void>;
}

const ActivityContext = createContext<ActivityContextType>({
  activities: [],
  loading: true,
  filteredActivities: () => [],
  clearAll: () => {},
  refetch: async () => {},
});

export function ActivityProvider({ children }: { children: ReactNode }) {
  const { propertyId } = usePropertyContext();
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = useCallback(async () => {
    if (!propertyId) {
      setActivities([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("activity_log")
      .select("*")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (data) {
      setActivities(data.map((a) => ({
        id: a.id,
        type: a.type as ActivityEvent["type"],
        action: a.action,
        title: a.title,
        description: a.description || "",
        entityId: a.entity_id || "",
        entityType: a.entity_type || "",
        actor: a.actor || "System",
        timestamp: a.created_at,
        propertyId: a.property_id,
      })));
    }
    setLoading(false);
  }, [propertyId]);

  useEffect(() => {
    fetchActivities();

    const handler = () => fetchActivities();
    window.addEventListener("activity-logged", handler);
    return () => window.removeEventListener("activity-logged", handler);
  }, [fetchActivities]);

  const filteredActivities = useCallback(
    (type?: string) => {
      if (!type || type === "all") return activities;
      return activities.filter((a) => a.type === type);
    },
    [activities]
  );

  const clearAll = useCallback(async () => {
    if (!propertyId) return;
    await supabase.from("activity_log").delete().eq("property_id", propertyId);
    setActivities([]);
  }, [propertyId]);

  return (
    <ActivityContext.Provider value={{ activities, loading, filteredActivities, clearAll, refetch: fetchActivities }}>
      {children}
    </ActivityContext.Provider>
  );
}

export const useActivity = () => useContext(ActivityContext);
