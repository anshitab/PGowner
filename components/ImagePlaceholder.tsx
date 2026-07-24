"use client";

import { ImageIcon } from "lucide-react";

interface ImagePlaceholderProps {
  width?: string;
  height?: string;
  label?: string;
  className?: string;
  rounded?: string;
  src?: string;
}

export default function ImagePlaceholder({
  width = "w-full",
  height = "h-48",
  label,
  className = "",
  rounded = "rounded-xl",
  src,
}: ImagePlaceholderProps) {
  if (src) {
    return (
      <div className={`${width} ${height} ${rounded} overflow-hidden relative ${className}`}>
        <img
          src={src}
          alt={label || ""}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {label && (
          <span className="absolute bottom-2 left-3 text-xs font-medium text-white bg-black/50 px-2 py-0.5 rounded">
            {label}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`${width} ${height} ${rounded} bg-gradient-to-br from-slate-100 to-slate-200 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-2 ${className}`}
    >
      <ImageIcon size={32} className="text-slate-400" />
      {label && (
        <span className="text-xs font-medium text-slate-500">{label}</span>
      )}
    </div>
  );
}
