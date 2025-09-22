"use client";
import AgoraRTC, { IAgoraRTCClient } from "agora-rtc-sdk-ng";

export function createRtcClient(): IAgoraRTCClient {
  return AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
}