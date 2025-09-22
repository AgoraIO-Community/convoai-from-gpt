import { NextRequest } from "next/server";
import { RtcRole, RtcTokenBuilder } from "agora-access-token";

export const runtime = "nodejs";
export const maxDuration = 60;

function basicAuth(id: string, secret: string) {
  return "Basic " + Buffer.from(`${id}:${secret}`).toString("base64");
}

export async function POST(req: NextRequest) {
  try {
    const { channel } = await req.json();
    if (!channel) return new Response(JSON.stringify({ error: "channel required" }), { status: 400 });

    const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID!;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE!;
    const ttl = Number(process.env.AGORA_RTC_TOKEN_TTL || 3600);
    const expireTs = Math.floor(Date.now() / 1000) + ttl;

    // Dedicated agent UID + token
    const agentUid = 1001;
    const agentToken = RtcTokenBuilder.buildTokenWithUid(
      appId, appCertificate, channel, agentUid, RtcRole.PUBLISHER, expireTs
    );

    // Basic auth for Agora REST
    const auth = basicAuth(process.env.AGORA_CUSTOMER_ID!, process.env.AGORA_CUSTOMER_SECRET!);

    // OpenAI settings
    const openaiKey = process.env.OPENAI_API_KEY!;
    const llmModel = process.env.OPENAI_LLM_MODEL || "gpt-4o-mini";
    const ttsModel = process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts";
    const ttsVoice = process.env.OPENAI_TTS_VOICE || "alloy";

    const url = `https://api.agora.io/api/conversational-ai-agent/v2/projects/${appId}/join`;
    const payload = {
      name: `promer-agent-${Date.now()}`,
      properties: {
        channel,
        token: agentToken,
        agent_rtc_uid: String(agentUid),
        remote_rtc_uids: ["*"],
        asr: {
          vendor: "openai",
          language: process.env.OPENAI_ASR_LANGUAGE || "en-US",
          params: {
            api_key: openaiKey,
            model: process.env.OPENAI_ASR_MODEL || "gpt-4o-mini-transcribe"
          }
        },
        llm: {
          url: "https://api.openai.com/v1/chat/completions",
          api_key: openaiKey,
          system_messages: [{ role: "system", content: "You are a helpful realtime assistant." }],
          params: { model: llmModel },
          input_modalities: ["text"],
          output_modalities: ["text"],
          greeting_message: "Hello! I’m connected and listening."
        },
        tts: {
          vendor: "openai",
          params: {
            api_key: openaiKey,
            model: ttsModel,
            voice: ttsVoice,
            instructions: "Natural, friendly tone.",
            speed: 1
          }
        }
      }
    };

    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: auth },
      body: JSON.stringify(payload)
    });

    const text = await r.text();
    let data: any = {};
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (!r.ok) {
      return new Response(JSON.stringify({ error: data?.detail || data?.reason || "engine start failed", data }), { status: r.status });
    }
    return Response.json({ ok: true, ...data });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "agent start error" }), { status: 500 });
  }
}