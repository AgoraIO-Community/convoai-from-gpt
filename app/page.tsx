"use client";

import { useCallback, useEffect, useRef, useState } from "react";
// ❗ type-only imports are erased at build time (safe for SSR)
import type {
    IAgoraRTCClient,
    ILocalAudioTrack,
    MicrophoneAudioTrackInitConfig,
} from "agora-rtc-sdk-ng";

import ConnectionStatus from "@/components/ConnectionStatus";
import TtsToggle from "@/components/TtsToggle";
import DebugConsole from "@/components/DebugConsole";
import ChatPanel from "@/components/ChatPanel";
import MicLevel from "@/components/MicLevel";
import Captions, { type CaptionLine } from "@/components/Captions";
import type { DebugEntry, JoinState } from "@/lib/types";

const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;
const DEFAULT_CHANNEL = process.env.NEXT_PUBLIC_DEFAULT_CHANNEL || "devrel-demo";

let AgoraRTC: typeof import("agora-rtc-sdk-ng")["default"] | null = null;

export default function HomePage() {
    const [joinState, setJoinState] = useState<JoinState>("idle");
    const [channel, setChannel] = useState(DEFAULT_CHANNEL);
    const [uid] = useState(() => Math.floor(Math.random() * 10000000));
    const [agentUid, setAgentUid] = useState<string | null>(null);
    const [agentId, setAgentId] = useState<string | null>(null);
    const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);
    const [ttsEnabled, setTtsEnabled] = useState(false);
    const [logs, setLogs] = useState<DebugEntry[]>([]);
    const [micLevel, setMicLevel] = useState(0);
    const [agentBusy, setAgentBusy] = useState(false);
    const [captions, setCaptions] = useState<CaptionLine[]>([]);
    const [lastPoll, setLastPoll] = useState<string | null>(null);

    // SDK readiness (set true after dynamic import)
    const [rtcReady, setRtcReady] = useState(false);

    const clientRef = useRef<IAgoraRTCClient | null>(null);
    const micTrackRef = useRef<ILocalAudioTrack | null>(null);
    const remoteAudioMap = useRef<Map<string, any>>(new Map());

    const captionSeen = useRef<Set<string>>(new Set());
    const captionKey = (speaker: string, text: string, ts: string) => `${speaker}|${ts}|${text}`;

    // ---- load Agora SDK only in the browser
    useEffect(() => {
        let mounted = true;
        (async () => {
            if (typeof window === "undefined") return;
            if (!AgoraRTC) {
                const mod = await import("agora-rtc-sdk-ng");
                AgoraRTC = mod.default;
            }
            if (mounted) setRtcReady(true);
        })();
        return () => { mounted = false; };
    }, []);

    // ---- poll agent history → captions
    useEffect(() => {
        if (!agentId) return;
        let timer: ReturnType<typeof setInterval> | undefined;
        const tick = async () => {
            try {
                const res = await fetch(`/api/agent/history?agentId=${encodeURIComponent(agentId)}&limit=50`, { cache: "no-store" });
                const data = await res.json();
                const items = Array.isArray(data?.items) ? data.items : [];
                const lines = items.map((it: any) => {
                    const speaker = it.role === "assistant" || it.speaker === "agent" ? "agent" : (it.role === "user" ? "user" : "system");
                    const text = it.text || it.content || "";
                    const ts = it.ts || it.timestamp || new Date().toISOString();
                    return { ts, speaker, text };
                }).filter((l: any) => l.text && typeof l.text === "string");
                if (lines.length) {
                    setCaptions(prev => {
                        const out = [...prev];
                        for (const l of lines) {
                            const key = captionKey(l.speaker, l.text, l.ts);
                            if (!captionSeen.current.has(key)) {
                                captionSeen.current.add(key);
                                out.push(l as any);
                            }
                        }
                        return out.slice(-200);
                    });
                }
            } catch {}
        };
        timer = setInterval(tick, 2000);
        tick();
        return () => { if (timer) clearInterval(timer); };
    }, [agentId]);

    // ---- poll our in-memory captions (webhook/typed)
    useEffect(() => {
        let timer: ReturnType<typeof setInterval> | undefined;
        const tick = async () => {
            try {
                const q = lastPoll ? `?since=${encodeURIComponent(lastPoll)}` : "";
                const res = await fetch(`/api/agent/captions/poll${q}`, { cache: "no-store" });
                const data = await res.json();
                if (Array.isArray(data?.lines) && data.lines.length) {
                    setCaptions(prev => [...prev, ...data.lines]);
                }
                if (data?.now) setLastPoll(data.now);
            } catch {}
        };
        timer = setInterval(tick, 1500);
        tick();
        return () => { if (timer) clearInterval(timer); };
    }, [lastPoll]);

    // ---- mic level polling (client only)
    useEffect(() => {
        let timer: ReturnType<typeof setInterval> | undefined;
        const poll = () => {
            const track: any = micTrackRef.current as any;
            const lv = track && typeof track.getVolumeLevel === "function" ? track.getVolumeLevel() : 0;
            setMicLevel(lv || 0);
        };
        timer = setInterval(poll, 100);
        return () => { if (timer) clearInterval(timer); };
    }, []);

    const pushLog = useCallback((scope: DebugEntry["scope"], message: string, data?: unknown) => {
        setLogs((prev) => [...prev, { ts: new Date().toISOString(), scope, message, data }]);
    }, []);

    const ensureClient = useCallback(() => {
        if (!rtcReady || !AgoraRTC) throw new Error("RTC SDK not ready yet");
        if (!clientRef.current) {
            clientRef.current = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        }
        return clientRef.current;
    }, [rtcReady]);
    const onConnectionStateChange = (state: string) => {
        // ...
    };

    const join = useCallback(async () => {
        try {
            if (!rtcReady || !AgoraRTC) throw new Error("RTC SDK not ready");
            setJoinState("joining");
            pushLog("ui", "Join requested", { channel, uid });

            const res = await fetch("/api/token", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ channel, uid })
            });
            if (!res.ok) throw new Error(`Token fetch failed: ${res.status}`);
            const { token } = await res.json();
            pushLog("server", "Token received");

            const client = ensureClient();

            client.off("connection-state-change", onConnectionStateChange );
            client.on("connection-state-change", (cur, prev, reason) =>
                pushLog("rtc", "connection-state-change", { cur, prev, reason })
            );

            client.on("user-published", async (user, mediaType) => {
                try {
                    await client.subscribe(user, mediaType);
                    pushLog("rtc", "user-published", { uid: user.uid, mediaType });
                    if (mediaType === "audio" && user.audioTrack) {
                        user.audioTrack.play(); // agent voice
                        remoteAudioMap.current.set(String(user.uid), user.audioTrack);
                    }
                } catch (e) {
                    pushLog("rtc", "subscribe error", e);
                }
            });

            client.off("user-unpublished", onConnectionStateChange);
            client.on("user-unpublished", (user, mediaType) => {
                pushLog("rtc", "user-unpublished", { uid: user.uid, mediaType });
                if (mediaType === "audio") {
                    const t = remoteAudioMap.current.get(String(user.uid));
                    try { t && t.stop && t.stop(); } catch {}
                    remoteAudioMap.current.delete(String(user.uid));
                }
            });

            await client.join(APP_ID, channel, token, uid);
            pushLog("rtc", "Joined channel");

            const micConfig: MicrophoneAudioTrackInitConfig = { encoderConfig: "music_standard" };
            const track = await AgoraRTC.createMicrophoneAudioTrack(micConfig);
            micTrackRef.current = track;
            await client.publish([track]);
            pushLog("rtc", "Published mic");

            setJoinState("connected");
        } catch (err) {
            console.error(err);
            pushLog("rtc", "Join error", err);
            setJoinState("error");
        }
    }, [APP_ID, channel, uid, ensureClient, pushLog, rtcReady]);

    const leave = useCallback(async () => {
        try {
            const client = clientRef.current;
            if (micTrackRef.current) {
                micTrackRef.current.stop();
                micTrackRef.current.close();
                micTrackRef.current = null;
            }
            if (client) {
                for (const [_uid, t] of remoteAudioMap.current.entries()) {
                    try { t.stop(); } catch {}
                }
                remoteAudioMap.current.clear();
                await client.leave();
                clientRef.current = null;
            }
            pushLog("rtc", "Left channel");
            setJoinState("disconnected");
        } catch (err) {
            pushLog("rtc", "Leave error", err);
        }
    }, [pushLog]);

    const handleStopAgent = useCallback(async () => {
        try {
            if (!agentId) throw new Error("Agent not started");
            const res = await fetch("/api/agent/stop", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ agentId })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "stop failed");
            setAgentId(null);
            setAgentUid(null);
        } catch (err) {
            console.error("Stop agent error", err);
        }
    }, [agentId]);

    const startAgent = useCallback(async () => {
        setAgentBusy(true);
        try {
            const res = await fetch("/api/agent/start", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ channel })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "Agent start failed");
            setAgentUid(String(data.uid ?? data.agentUid ?? "unknown"));
            setAgentId(String(data.agent_id ?? data.id ?? ""));
            pushLog("agent", "Agent started", data);
        } catch (err) {
            pushLog("agent", "Agent start error", err);
            alert("Failed to start agent. See Debug console.");
        } finally {
            setAgentBusy(false);
        }
    }, [channel, pushLog]);

    const stopAgent = useCallback(async () => {
        setAgentBusy(true);
        try {
            const res = await fetch("/api/agent/stop", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ agentId }) });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "Agent stop failed");
            setAgentUid(null);
            setAgentId(null);
            pushLog("agent", "Agent stopped", data);
        } catch (err) {
            pushLog("agent", "Agent stop error", err);
            alert("Failed to stop agent. See Debug console.");
        } finally {
            setAgentBusy(false);
        }
    }, [pushLog, agentId]);

    const handleSend = useCallback(async (text: string) => {
        setMessages((m) => [...m, { role: "user", text }]);
        try {
            if (!agentId) throw new Error("Agent not started");
            const res = await fetch("/api/agent/text", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ agentId, userText: text, speak: ttsEnabled })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "text failed");
            setMessages((m) => [...m, { role: "user", text }, { role: "ai", text: data.aiText }]);
            try {
                await fetch("/api/agent/captions/ingest", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ text: data.aiText, speaker: "agent" })
                });
            } catch {}
        } catch (err: any) {
            setMessages((m) => [...m, { role: "user", text }, { role: "ai", text: "[error sending to agent]" }]);
        }
    }, [agentId, ttsEnabled]);

    return (
        <section style={{ display: "grid", gap: "1.5rem" }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Agora DevRel Example: Vernon Marshall</h1>

            <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
                <div style={{ border: "1px solid #e2e8f0", borderRadius: "0.5rem", padding: "0.75rem", background: "white" }}>
                    <h2 style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Channel</h2>
                    <label style={{ display: "block", fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                        Name
                        <input
                            value={channel}
                            onChange={(e) => setChannel(e.target.value)}
                            style={{ marginTop: "0.25rem", width: "100%", border: "1px solid #cbd5e1", borderRadius: "0.375rem", padding: "0.25rem 0.5rem" }}
                            placeholder="channel name"
                        />
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <button
                            style={{ padding: "0.25rem 0.75rem", borderRadius: "0.375rem", background: "#047857", color: "white", opacity: (joinState === "joining" || joinState === "connected" || !rtcReady) ? 0.6 : 1 }}
                            onClick={join}
                            disabled={joinState === "joining" || joinState === "connected" || !rtcReady}
                            title={rtcReady ? "" : "Loading RTC SDK…"}
                        >
                            Join
                        </button>
                        <button
                            style={{ padding: "0.25rem 0.75rem", borderRadius: "0.375rem", background: "#0f172a", color: "white" }}
                            onClick={leave}
                        >
                            Leave
                        </button>
                        <ConnectionStatus state={joinState} />
                    </div>
                    <div style={{ marginTop: "0.75rem" }}>
                        <MicLevel level={micLevel} />
                    </div>
                    <div style={{ fontSize: "0.8rem", marginTop: "0.5rem", opacity: 0.7 }}>
                        UID: <code>{uid}</code>
                    </div>
                </div>

                <div style={{ border: "1px solid #e2e8f0", borderRadius: "0.5rem", padding: "0.75rem", background: "white" }}>
                    <h2 style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Agent</h2>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <button
                            style={{ padding: "0.25rem 0.75rem", borderRadius: "0.375rem", background: "#1d4ed8", color: "white", opacity: (agentId || agentBusy || joinState !== "connected") ? 0.6 : 1 }}
                            onClick={startAgent}
                            disabled={!!agentId || agentBusy || joinState !== "connected"}
                        >
                            Start Agent
                        </button>
                        <button
                            style={{ padding: "0.25rem 0.75rem", borderRadius: "0.375rem", background: "#be123c", color: "white", opacity: (!agentId || agentBusy) ? 0.6 : 1 }}
                            onClick={stopAgent}
                            disabled={!agentId || agentBusy}
                        >
                            Stop Agent
                        </button>
                        <div style={{ fontSize: "0.9rem" }}>
                            Agent UID: <strong>{agentUid ?? "—"}</strong>
                        </div>
                    </div>
                    <div style={{ marginTop: "0.75rem" }}>
                        <TtsToggle enabled={ttsEnabled} onChange={setTtsEnabled} />
                    </div>
                </div>
            </div>

            <ChatPanel messages={messages} onSend={handleSend} />

            <Captions lines={captions} />

            <DebugConsole entries={logs} />
        </section>
    );
}
