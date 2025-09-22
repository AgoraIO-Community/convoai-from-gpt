import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { text, voice, model } = await req.json();
    if (!text) return new Response(JSON.stringify({ error: "text required" }), { status: 400 });

    const apiKey = process.env.OPENAI_API_KEY!;
    const useModel = (model || process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts") as string;
    const useVoice = (voice || process.env.OPENAI_TTS_VOICE || "alloy") as string;
    const format = process.env.OPENAI_TTS_FORMAT || "mp3";

    const r = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: useModel,
        voice: useVoice,
        input: text,
        format
      })
    });

    if (!r.ok) {
      const err = await r.text();
      return new Response(JSON.stringify({ error: `OpenAI TTS error: ${err}` }), { status: 500 });
    }

    const arrayBuf = await r.arrayBuffer();
    const base64 = Buffer.from(arrayBuf).toString("base64");
    return Response.json({ audioBase64: base64, model: useModel, voice: useVoice, format });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "tts error" }), { status: 500 });
  }
}