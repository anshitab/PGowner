"use client";

import { Bot, User } from "lucide-react";

interface Props {
  role: "user" | "assistant";
  content: string;
}

export default function ChatMessage({ role, content }: Props) {
  const isUser = role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          isUser ? "bg-indigo-100" : "bg-emerald-100"
        }`}
      >
        {isUser ? (
          <User size={14} className="text-indigo-600" />
        ) : (
          <Bot size={14} className="text-emerald-600" />
        )}
      </div>
      <div
        className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? "bg-indigo-600 text-white rounded-tr-md"
            : "bg-white border border-slate-200 text-slate-800 rounded-tl-md shadow-sm"
        }`}
      >
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}
