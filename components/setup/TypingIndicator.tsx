"use client";

import { Bot } from "lucide-react";

export default function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
        <Bot size={14} className="text-emerald-600" />
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
