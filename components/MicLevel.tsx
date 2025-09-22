"use client";
import { useEffect, useRef } from "react";

export default function MicLevel({ level }: { level: number }) {
  // Clamp 0..1
  const pct = Math.max(0, Math.min(1, level)) * 100;

  return (
    <div style={{ display: "grid", gap: "0.25rem" }}>
      <div style={{ fontSize: "0.85rem", opacity: 0.8 }}>Mic level</div>
      <div
        style={{
          height: "10px",
          background: "#e2e8f0",
          borderRadius: "999px",
          overflow: "hidden",
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)"
        }}
        aria-label={`Mic level ${Math.round(pct)}%`}
      >
        <div
          style={{
            width: pct + "%",
            height: "100%",
            background: pct > 66 ? "#16a34a" : pct > 33 ? "#22c55e" : "#86efac",
            transition: "width 80ms linear"
          }}
        />
      </div>
    </div>
  );
}