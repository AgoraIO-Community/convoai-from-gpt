"use client";
import { FormEvent, useRef } from "react";

export default function ChatPanel({
  messages,
  onSend
}: {
  messages: { role: "user" | "ai"; text: string }[];
  onSend: (text: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const val = inputRef.current?.value?.trim();
    if (!val) return;
    onSend(val);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: "0.5rem", padding: "0.75rem", background: "white" }}>
      <div style={{ height: "12rem", overflow: "auto", fontSize: "0.9rem", marginBottom: "0.75rem" }}>
        {messages.length === 0 && (<div style={{ opacity: 0.6 }}>No messages yet. Say hi!</div>)}
        {messages.map((m, idx) => (
          <div key={idx} style={{ marginBottom: "0.5rem" }}>
            <strong style={{ color: m.role === "user" ? "#1d4ed8" : "#047857" }}>
              {m.role === "user" ? "You" : "AI"}:
            </strong>{" "}<span>{m.text}</span>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem" }}>
        <input
          ref={inputRef}
          style={{ flex: 1, border: "1px solid #cbd5e1", borderRadius: "0.375rem", padding: "0.25rem 0.5rem" }}
          placeholder="Type a message"
        />
        <button style={{ padding: "0.25rem 0.75rem", borderRadius: "0.375rem", background: "#0f172a", color: "white" }} type="submit">
          Send
        </button>
      </form>
    </div>
  );
}