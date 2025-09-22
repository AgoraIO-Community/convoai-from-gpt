import { NextRequest } from "next/server";
import { getCaptions } from "../_store";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const since = new URL(req.url).searchParams.get("since") || undefined;
    const lines = getCaptions(since);
    return Response.json({ lines, now: new Date().toISOString() });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "poll error" }), { status: 500 });
  }
}