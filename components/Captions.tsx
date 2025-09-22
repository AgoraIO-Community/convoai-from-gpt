"use client";
import { useEffect, useRef } from "react";

export interface CaptionLine {
  ts: string;
  speaker: "agent" | "user" | "system";
  text: string;
}

export default function Captions({ lines }: { lines: CaptionLine[] }) {
  const badge = (speaker: "agent" | "user" | "system") => {
    const bg = speaker === "agent" ? "#d1fae5" : speaker === "user" ? "#bfdbfe" : "#e5e7eb";
    const fg = speaker === "agent" ? "#065f46" : speaker === "user" ? "#1e3a8a" : "#374151";
    const label = speaker === "agent" ? "Agent" : speaker === "user" ? "User" : "System";
    return (
      <span
        style={{
          padding: "0.15rem 0.5rem",
          borderRadius: "6px",
          backgroundColor: bg,
          color: fg,
          fontWeight: 700,
          fontSize: "0.75rem",
          lineHeight: 1.2,
          whiteSpace: "nowrap"
        }}
      >
        {label}
      </span>
    );
  };

  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: "0.5rem", background: "white" }}>
      <div style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #e2e8f0", fontWeight: 600 }}>
        Captions
      </div>
      <div ref={scroller} style={{ height: "10rem", overflow: "auto", padding: "0.5rem 0.75rem", fontSize: "0.9rem" }}>
        {lines.length === 0 ? <div style={{ opacity: 0.6 }}>No captions yet…</div> : null}
        {lines.map((c, i) => (
        <div key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.4rem" }}>
          {badge(c.speaker)}
          <span>{c.text}</span>
          <span style={{ marginLeft: "auto", fontSize: "0.7rem", color: "#6b7280" }}>
            {new Date(c.ts).toLocaleTimeString()}
          </span>
        </div>
      ))}
      </div>
    </div>
  );
}
