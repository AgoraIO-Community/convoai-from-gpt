import { NextRequest } from "next/server";
import { addCaption } from "../_store";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { text, speaker = "agent", ts } = await req.json();
    if (!text) return new Response(JSON.stringify({ error: "text required" }), { status: 400 });
    const line = {
      ts: ts || new Date().toISOString(),
      speaker: (speaker === "user" || speaker === "system") ? speaker : "agent",
      text
    } as const;
    addCaption(line);
    return Response.json({ ok: true });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "ingest error" }), { status: 500 });
  }
}