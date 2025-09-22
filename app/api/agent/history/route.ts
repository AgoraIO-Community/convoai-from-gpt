import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

function basicAuth(id: string, secret: string) {
  return "Basic " + Buffer.from(`${id}:${secret}`).toString("base64");
}

// GET /api/agent/history?agentId=...&limit=50
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const agentId = url.searchParams.get("agentId");
    const limit = url.searchParams.get("limit") || "50";
    if (!agentId) {
      return new Response(JSON.stringify({ error: "agentId required" }), { status: 400 });
    }
    const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID!;
    const auth = basicAuth(process.env.AGORA_CUSTOMER_ID!, process.env.AGORA_CUSTOMER_SECRET!);
    const histUrl = `https://api.agora.io/api/conversational-ai-agent/v2/projects/${appId}/agents/${agentId}/history?limit=${encodeURIComponent(limit)}`;

    const r = await fetch(histUrl, { headers: { authorization: auth } });
    const text = await r.text();
    let data: any = {};
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    if (!r.ok) {
      return new Response(JSON.stringify({ error: data?.detail || data?.reason || "history failed", data }), { status: r.status });
    }
    return Response.json(data);
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "history error" }), { status: 500 });
  }
}
