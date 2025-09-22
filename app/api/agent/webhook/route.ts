import { NextRequest } from "next/server";
import { addCaption } from "../captions/_store";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Minimal webhook relay:
 * - Optional shared secret via env: WEBHOOK_SHARED_SECRET
 *   → validate against header: X-Webhook-Secret
 * - Accepts a variety of shapes and extracts { text, speaker }
 * - Writes directly into the in-memory captions store
 *
 * NOTE: In production, persist to DB/KV instead of memory.
 */
export async function POST(req: NextRequest) {
  try {
    const shared = process.env.WEBHOOK_SHARED_SECRET;
    if (shared) {
      const got = req.headers.get("x-webhook-secret") || "";
      if (got !== shared) {
        return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
      }
    }

    const body = await req.json();

    // Try to extract text/speaker from common shapes
    let text = body?.text || body?.message || body?.result?.text || body?.data?.text || "";
    let speaker = body?.speaker || body?.role || body?.from || "agent";

    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "no text found" }), { status: 400 });
    }
    if (typeof speaker !== "string") speaker = "agent";
    speaker = (speaker === "user" || speaker === "system") ? speaker : "agent";

    addCaption({ ts: new Date().toISOString(), speaker, text });
    return Response.json({ ok: true });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "webhook error" }), { status: 500 });
  }
}
