"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "./supabase";
import { usePropertyContext } from "./PropertyContext";

export interface Announcement {
  id: string;
  title: string;
  message: string;
  priority: "normal" | "important" | "urgent";
  createdAt: string;
}

interface AnnouncementContextType {
  announcements: Announcement[];
  loading: boolean;
  addAnnouncement: (a: Omit<Announcement, "id" | "createdAt">) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

const AnnouncementContext = createContext<AnnouncementContextType>({
  announcements: [],
  loading: true,
  addAnnouncement: async () => {},
  deleteAnnouncement: async () => {},
  refetch: async () => {},
});

export function AnnouncementProvider({ children }: { children: ReactNode }) {
  const { propertyId } = usePropertyContext();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnnouncements = useCallback(async () => {
    if (!propertyId) {
      setAnnouncements([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("announcements")
      .select("*")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false });

    if (data) {
      setAnnouncements(data.map((a) => ({
        id: a.id,
        title: a.title,
        message: a.message || "",
        priority: a.priority as Announcement["priority"],
        createdAt: a.created_at?.split("T")[0] || "",
      })));
    }
    setLoading(false);
  }, [propertyId]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const addAnnouncement = useCallback(async (a: Omit<Announcement, "id" | "createdAt">) => {
    if (!propertyId) return;

    const { data } = await supabase
      .from("announcements")
      .insert({
        property_id: propertyId,
        title: a.title,
        message: a.message,
        priority: a.priority,
      })
      .select()
      .single();

    if (data) {
      setAnnouncements((prev) => [{
        id: data.id,
        title: a.title,
        message: a.message,
        priority: a.priority,
        createdAt: new Date().toISOString().split("T")[0],
      }, ...prev]);
    }
  }, [propertyId]);

  const deleteAnnouncement = useCallback(async (id: string) => {
    await supabase.from("announcements").delete().eq("id", id);
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return (
    <AnnouncementContext.Provider value={{ announcements, loading, addAnnouncement, deleteAnnouncement, refetch: fetchAnnouncements }}>
      {children}
    </AnnouncementContext.Provider>
  );
}

export function useAnnouncements() {
  return useContext(AnnouncementContext);
}
