"use client";
import { JoinState } from "@/lib/types";

export default function ConnectionStatus({ state }: { state: JoinState }) {
  const color =
    state === "connected" ? "#059669" :
    state === "joining"   ? "#d97706" :
    state === "error"     ? "#dc2626" : "#475569";

  return (
    <div style={{ fontSize: "0.9rem", color }}>
      Status: <strong>{state}</strong>
    </div>
  );
}