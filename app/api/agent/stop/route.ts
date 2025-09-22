import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

function basicAuth(id: string, secret: string) {
  return "Basic " + Buffer.from(`${id}:${secret}`).toString("base64");
}

export async function POST(req: NextRequest) {
  try {
    const { agentId } = await req.json();
    if (!agentId) {
      return new Response(JSON.stringify({ error: "agentId required" }), { status: 400 });
    }

    const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID!;
    const auth = basicAuth(process.env.AGORA_CUSTOMER_ID!, process.env.AGORA_CUSTOMER_SECRET!);
    const url = `https://api.agora.io/api/conversational-ai-agent/v2/projects/${appId}/agents/${agentId}/leave`;

    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: auth }
    });

    const text = await r.text();
    let data: any = {};
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (!r.ok) {
      return new Response(JSON.stringify({ error: data?.detail || data?.reason || "engine leave failed", data }), { status: r.status });
    }

    return Response.json({ ok: true, ...data });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "agent stop error" }), { status: 500 });
  }
}