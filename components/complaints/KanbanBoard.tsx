"use client";

import { useComplaints, Complaint } from "@/lib/ComplaintContext";
import { Chip } from "@heroui/react";
import { AlertCircle, Clock, CheckCircle2, XCircle, GripVertical } from "lucide-react";
import { useState } from "react";

const columns: { status: Complaint["status"]; label: string; color: string; icon: React.ReactNode }[] = [
  { status: "Open", label: "Open", color: "bg-red-50 border-red-200", icon: <AlertCircle size={14} className="text-red-500" /> },
  { status: "In Progress", label: "In Progress", color: "bg-amber-50 border-amber-200", icon: <Clock size={14} className="text-amber-500" /> },
  { status: "Resolved", label: "Resolved", color: "bg-emerald-50 border-emerald-200", icon: <CheckCircle2 size={14} className="text-emerald-500" /> },
  { status: "Closed", label: "Closed", color: "bg-slate-50 border-slate-200", icon: <XCircle size={14} className="text-slate-500" /> },
];

const priorityColor: Record<string, string> = {
  High: "danger",
  Medium: "warning",
  Low: "default",
};

interface Props {
  onSelectComplaint: (complaint: Complaint) => void;
}

export default function KanbanBoard({ onSelectComplaint }: Props) {
  const { complaints, updateStatus } = useComplaints();
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    setDragOverColumn(status);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, status: Complaint["status"]) => {
    e.preventDefault();
    if (draggedId !== null) {
      updateStatus(draggedId, status);
    }
    setDraggedId(null);
    setDragOverColumn(null);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {columns.map((col) => {
        const items = complaints.filter((c) => c.status === col.status);
        return (
          <div
            key={col.status}
            className={`rounded-xl border p-3 min-h-[300px] transition-all ${col.color} ${
              dragOverColumn === col.status ? "ring-2 ring-indigo-300 scale-[1.01]" : ""
            }`}
            onDragOver={(e) => handleDragOver(e, col.status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.status)}
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                {col.icon}
                <span className="text-xs font-semibold text-slate-700">{col.label}</span>
              </div>
              <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full">
                {items.length}
              </span>
            </div>

            <div className="space-y-2">
              {items.map((complaint) => (
                <div
                  key={complaint.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, complaint.id)}
                  onClick={() => onSelectComplaint(complaint)}
                  className={`bg-white border border-slate-200 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-all ${
                    draggedId === complaint.id ? "opacity-50 scale-95" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-xs font-semibold text-slate-800 leading-tight">{complaint.title}</p>
                    <GripVertical size={12} className="text-slate-300 shrink-0 mt-0.5" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Chip size="sm" variant="soft" color={priorityColor[complaint.priority] as "danger" | "warning" | "default"}>
                      {complaint.priority}
                    </Chip>
                    <span className="text-[10px] text-slate-400">{complaint.time}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1.5">{complaint.tenant} · {complaint.room}</p>
                </div>
              ))}
              {items.length === 0 && (
                <p className="text-[11px] text-slate-400 text-center py-6 italic">No items</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
