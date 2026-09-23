"use client";

import { Complaint, useComplaints } from "@/lib/ComplaintContext";
import { X, Send, Clock, Phone, UserCheck } from "lucide-react";
import { Chip, Button } from "@heroui/react";
import { useState } from "react";
import { useUserMode } from "@/lib/UserModeContext";
import { TRADE_LABELS } from "@/lib/service-trades";
import { toast } from "sonner";

interface Props {
  complaint: Complaint;
  onClose: () => void;
}

export default function ComplaintDetailModal({ complaint, onClose }: Props) {
  const { addComment, updateStatus, approveComplaint } = useComplaints();
  const { mode } = useUserMode();
  const [message, setMessage] = useState("");
  const [approving, setApproving] = useState(false);

  const handleSend = () => {
    if (!message.trim()) return;
    addComment(complaint.id, message.trim());
    setMessage("");
  };

  const statusOptions: Complaint["status"][] = ["Open", "In Progress", "Resolved", "Closed"];
  const isOwner = mode === "owner";
  const pendingApproval = complaint.approvalStatus === "pending" && complaint.status !== "Resolved";

  const handleApprove = async () => {
    setApproving(true);
    const result = await approveComplaint(complaint.id);
    setApproving(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Technician assigned");
    onClose();
  };

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

          <p className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
            Issue type: <strong>{TRADE_LABELS[complaint.category || "general"]}</strong>
            {pendingApproval && isOwner ? " · Approve to assign the matching contact" : ""}
          </p>

          {(complaint.vendorName || complaint.vendorPhone) && (
            <div className="flex items-start gap-2 text-sm text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
              <UserCheck size={16} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">{complaint.vendorName || complaint.assignedTo}</p>
                {complaint.vendorTrade && (
                  <p className="text-xs text-emerald-700">{TRADE_LABELS[complaint.vendorTrade as keyof typeof TRADE_LABELS] || complaint.vendorTrade}</p>
                )}
                {complaint.vendorPhone && (
                  <p className="text-xs flex items-center gap-1 mt-1">
                    <Phone size={12} />
                    {complaint.vendorPhone}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Chip size="sm" variant="soft" color={complaint.priority === "High" ? "danger" : complaint.priority === "Medium" ? "warning" : "default"}>
              {complaint.priority}
            </Chip>
            {isOwner ? (
              <select
                value={complaint.status}
                onChange={(e) => updateStatus(complaint.id, e.target.value as Complaint["status"])}
                className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            ) : (
              <Chip size="sm" variant="soft">{complaint.status}</Chip>
            )}
            {isOwner && pendingApproval && (
              <Button variant="primary" size="sm" onPress={handleApprove} isDisabled={approving}>
                {approving ? "Assigning…" : "Approve & assign"}
              </Button>
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
