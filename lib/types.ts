export type JoinState = "idle" | "joining" | "connected" | "disconnected" | "error";

export interface DebugEntry {
  ts: string;
  scope: "rtc" | "agent" | "tts" | "ui" | "server";
  message: string;
  data?: unknown;
}