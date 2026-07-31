import { supabase } from "./supabase";

export interface ActivityEvent {
  id: string;
  type: "payment" | "complaint" | "visitor" | "announcement" | "tenant_move" | "expense" | "maintenance" | "checkout" | "bed_transfer" | "room_edit";
  action: string;
  title: string;
  description: string;
  entityId: string;
  entityType: string;
  actor: string;
  timestamp: string;
  propertyId: string;
}

export async function logActivity(event: Omit<ActivityEvent, "id" | "timestamp">) {
  const { error } = await supabase.from("activity_log").insert({
    property_id: event.propertyId,
    type: event.type,
    action: event.action,
    title: event.title,
    description: event.description,
    entity_id: event.entityId,
    entity_type: event.entityType,
    actor: event.actor,
  });

  if (!error && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("activity-logged"));
  }
}
