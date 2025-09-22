import { NextRequest } from "next/server";
import { RtcRole, RtcTokenBuilder } from "agora-access-token";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { channel, uid } = await req.json();
    if (!channel) {
      return new Response(JSON.stringify({ error: "channel required" }), { status: 400 });
    }
    const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID!;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE!;
    const ttl = Number(process.env.AGORA_RTC_TOKEN_TTL || 3600);

    const role = RtcRole.PUBLISHER;
    const privilegeExpireTime = Math.floor(Date.now() / 1000) + ttl;

    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channel,
      Number(uid) || 0,
      role,
      privilegeExpireTime
    );

    return Response.json({ token });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "token error" }), { status: 500 });
  }
}