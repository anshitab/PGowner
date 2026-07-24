"use client";

import { Complaint, useComplaints } from "@/lib/ComplaintContext";
import { X, Send, Clock } from "lucide-react";
import { Chip } from "@heroui/react";
import { useState } from "react";

interface Props {
  complaint: Complaint;
  onClose: () => void;
}

export default function ComplaintDetailModal({ complaint, onClose }: Props) {
  const { addComment, updateStatus } = useComplaints();
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (!message.trim()) return;
    addComment(complaint.id, message.trim());
    setMessage("");
  };

  const statusOptions: Complaint["status"][] = ["Open", "In Progress", "Resolved", "Closed"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden m-4 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">{complaint.title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {complaint.tenant} · {complaint.room} · {complaint.time}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={16} className="text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <p className="text-sm text-slate-700">{complaint.description}</p>

          <div className="flex items-center gap-3">
            <Chip size="sm" variant="soft" color={complaint.priority === "High" ? "danger" : complaint.priority === "Medium" ? "warning" : "default"}>
              {complaint.priority}
            </Chip>
            <select
              value={complaint.status}
              onChange={(e) => updateStatus(complaint.id, e.target.value as Complaint["status"])}
              className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {complaint.assignedTo && (
              <span className="text-[11px] text-slate-500">Assigned: {complaint.assignedTo}</span>
            )}
          </div>

          {/* Timeline / Comments */}
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-700 mb-3">Comments & Activity</p>
            {complaint.comments.length > 0 ? (
              <div className="space-y-3">
                {complaint.comments.map((c) => (
                  <div key={c.id} className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[9px] font-bold text-indigo-700 shrink-0">
                      {c.author[0]}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-800">{c.author}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(c.timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">{c.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-slate-400 py-4 justify-center">
                <Clock size={12} />
                No comments yet
              </div>
            )}
          </div>
        </div>

        {/* Comment Input */}
        <div className="px-6 py-3 border-t border-slate-200 flex items-center gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Add a comment..."
            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 placeholder:text-slate-400"
          />
          <button
            onClick={handleSend}
            disabled={!message.trim()}
            className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
