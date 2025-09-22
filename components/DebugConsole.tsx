"use client";
import { DebugEntry } from "@/lib/types";

export default function DebugConsole({ entries }: { entries: DebugEntry[] }) {
  return (
    <div style={{ marginTop: "1rem", padding: "0.75rem", background: "black", color: "white",
                  borderRadius: "0.5rem", fontSize: "0.8rem", height: "12rem", overflow: "auto" }}>
      {entries.length === 0 ? (
        <div style={{ opacity: 0.7 }}>No logs yet…</div>
      ) : entries.map((e, i) => (
        <pre key={i} style={{ whiteSpace: "pre-wrap", margin: 0 }}>
{`[${e.ts}] [${e.scope}] ${e.message}${e.data ? " " + JSON.stringify(e.data) : ""}`}
        </pre>
      ))}
    </div>
  );
}