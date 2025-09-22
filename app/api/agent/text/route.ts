import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

function basicAuth(id: string, secret: string) {
  return "Basic " + Buffer.from(`${id}:${secret}`).toString("base64");
}

export async function POST(req: NextRequest) {
  try {
    const { agentId, userText, speak = true } = await req.json();

    if (!agentId || !userText) {
      return new Response(JSON.stringify({ error: "agentId and userText required" }), { status: 400 });
    }

    // 1) LLM reply
    const openaiKey = process.env.OPENAI_API_KEY!;
    const llmModel = process.env.OPENAI_LLM_MODEL || "gpt-4o-mini";
    const llmRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: llmModel,
        messages: [
          { role: "system", content: "You are a concise, friendly voice agent." },
          { role: "user", content: userText }
        ]
      })
    });

    const llmText = await llmRes.text();
    let llmJson: any = {};
    try { llmJson = JSON.parse(llmText); } catch {}
    if (!llmRes.ok) {
      return new Response(JSON.stringify({ error: "LLM error", detail: llmJson || llmText }), { status: 502 });
    }
    const aiText: string = llmJson?.choices?.[0]?.message?.content?.trim() || "...";

    // 2) Ask the agent to speak (optional)
    let speakResult: any = null;
    if (speak) {
      const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID!;
      const auth = basicAuth(process.env.AGORA_CUSTOMER_ID!, process.env.AGORA_CUSTOMER_SECRET!);
      const speakUrl = `https://api.agora.io/api/conversational-ai-agent/v2/projects/${appId}/agents/${agentId}/speak`;

      const speakRes = await fetch(speakUrl, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: auth },
        body: JSON.stringify({ text: aiText })
      });

      const speakBody = await speakRes.text();
      try { speakResult = JSON.parse(speakBody); } catch { speakResult = { raw: speakBody }; }
      if (!speakRes.ok) {
        return new Response(JSON.stringify({ error: "Speak failed", detail: speakResult }), { status: 502 });
      }
    }

    return Response.json({ aiText, spoke: speak, speakResult });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "text route error" }), { status: 500 });
  }
}