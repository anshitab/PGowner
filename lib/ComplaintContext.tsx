"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "./supabase";
import { usePropertyContext } from "./PropertyContext";
import { useAuth } from "./AuthContext";
import { useUserMode } from "./UserModeContext";
import type { ServiceTrade } from "@/lib/service-trades";
import { resolveComplaintCategory } from "@/lib/complaint-routing";

export interface ComplaintComment {
  id: string;
  author: string;
  message: string;
  timestamp: string;
}

export interface Complaint {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  priority: "High" | "Medium" | "Low";
  status: "Open" | "In Progress" | "Resolved" | "Closed";
  tenant: string;
  room: string;
  date: string;
  time: string;
  assignedTo?: string;
  category?: ServiceTrade;
  approvalStatus?: "pending" | "approved" | "rejected";
  vendorName?: string;
  vendorPhone?: string;
  vendorTrade?: string;
  comments: ComplaintComment[];
}

interface ComplaintContextType {
  complaints: Complaint[];
  loading: boolean;
  updateStatus: (id: string, status: Complaint["status"]) => Promise<void>;
  approveComplaint: (id: string) => Promise<{ error?: string; code?: string }>;
  addComplaint: (complaint: Omit<Complaint, "id" | "date" | "time" | "comments">) => Promise<void>;
  addComment: (complaintId: string, message: string) => Promise<void>;
  refetch: () => Promise<void>;
}

const ComplaintContext = createContext<ComplaintContextType>({
  complaints: [],
  loading: true,
  updateStatus: async () => {},
  approveComplaint: async () => ({}),
  addComplaint: async () => {},
  addComment: async () => {},
  refetch: async () => {},
});

export function ComplaintProvider({ children }: { children: ReactNode }) {
  const { propertyId } = usePropertyContext();
  const { user } = useAuth();
  const { mode } = useUserMode();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvedPropertyId, setResolvedPropertyId] = useState<string | null>(null);

  useEffect(() => {
    if (propertyId) {
      setResolvedPropertyId(propertyId);
      return;
    }
    if (mode === "tenant" && user?.id) {
      fetch(`/api/tenant-data?userId=${user.id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.tenant?.property_id) {
            setResolvedPropertyId(data.tenant.property_id);
          }
        })
        .catch(() => {});
    }
  }, [propertyId, mode, user?.id]);

  const fetchComplaints = useCallback(async () => {
    if (!resolvedPropertyId) return;

    setLoading(true);
    const res = await fetch(`/api/complaints?property_id=${resolvedPropertyId}`);
    const data = await res.json();

    if (!Array.isArray(data)) {
      setComplaints([]);
      setLoading(false);
      return;
    }

    setComplaints(
      data.map((c: Record<string, unknown>) => {
        const vendor = c.service_vendors as {
          name: string;
          phone: string;
          trade: string;
        } | null;
        const title = c.title as string;
        const description = (c.description as string) || "";
        const category = resolveComplaintCategory(c.category as string | undefined, title, description);
        return {
        id: c.id as string,
        tenantId: c.tenant_id as string,
        title,
        description,
        priority: c.priority as Complaint["priority"],
        status: c.status as Complaint["status"],
        tenant: (c.tenants as { name: string; rooms?: { number: string } | null } | null)?.name || "",
        room: (c.tenants as { name: string; rooms?: { number: string } | null } | null)?.rooms?.number || "",
        date: (c.created_at as string)?.split("T")[0] || "",
        time: getRelativeTime(c.created_at as string),
        assignedTo: (c.assigned_to as string) || vendor?.name || undefined,
        category,
        approvalStatus: (c.approval_status as Complaint["approvalStatus"]) || "pending",
        vendorName: vendor?.name || (c.assigned_to as string) || undefined,
        vendorPhone: vendor?.phone || undefined,
        vendorTrade: vendor?.trade || category,
        comments: Array.isArray(c.comments) ? c.comments : [],
      };
      })
    );
    setLoading(false);
  }, [resolvedPropertyId]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const updateStatus = useCallback(async (id: string, status: Complaint["status"]) => {
    await supabase.from("complaints").update({ status }).eq("id", id);
    setComplaints((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
  }, []);

  const approveComplaint = useCallback(async (id: string) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return { error: "Please sign in again" };

    const res = await fetch("/api/complaints/approve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ complaintId: id }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { error: body.error || "Approval failed", code: body.code };
    }
    await fetchComplaints();
    return {};
  }, [fetchComplaints]);

  const addComplaint = useCallback(async (complaint: Omit<Complaint, "id" | "date" | "time" | "comments">) => {
    if (!propertyId) return;

    const { data } = await supabase
      .from("complaints")
      .insert({
        property_id: propertyId,
        tenant_id: complaint.tenantId,
        title: complaint.title,
        description: complaint.description,
        priority: complaint.priority,
        status: complaint.status,
      })
      .select()
      .single();

    if (data) {
      setComplaints((prev) => [{
        id: data.id,
        tenantId: complaint.tenantId,
        title: complaint.title,
        description: complaint.description,
        priority: complaint.priority,
        status: complaint.status,
        tenant: complaint.tenant,
        room: complaint.room,
        date: new Date().toISOString().split("T")[0],
        time: "Just now",
        comments: [],
      }, ...prev]);
    }
  }, [propertyId]);

  const addComment = useCallback(async (complaintId: string, message: string) => {
    const newComment: ComplaintComment = {
      id: crypto.randomUUID(),
      author: "Owner",
      message,
      timestamp: new Date().toISOString(),
    };

    const complaint = complaints.find((c) => c.id === complaintId);
    const updatedComments = [...(complaint?.comments || []), newComment];

    await supabase
      .from("complaints")
      .update({ comments: updatedComments })
      .eq("id", complaintId);

    setComplaints((prev) =>
      prev.map((c) => (c.id === complaintId ? { ...c, comments: updatedComments } : c))
    );
  }, [complaints]);

  return (
    <ComplaintContext.Provider value={{ complaints, loading, updateStatus, approveComplaint, addComplaint, addComment, refetch: fetchComplaints }}>
      {children}
    </ComplaintContext.Provider>
  );
}

export const useComplaints = () => useContext(ComplaintContext);

function getRelativeTime(timestamp: string): string {
  if (!timestamp) return "";
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
