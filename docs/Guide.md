# 🎙️ Create a Voice AI Agent Using Prompt Engineering and Agora

![header image] (/public/images/convoai-demo-header.png)

Real-time voice and LLM intelligence unlock entirely new ways for users to interact with applications. With Agora’s Conversational AI Engine, you can build voice agents that respond instantly, sound natural, and reason about user intent — all within a low-latency RTC channel.

In this guide, we’ll walk through how to build a fully working **Voice AI Agent** using Agora + OpenAI, with **prompt engineering** powering your agent’s behavior. You'll begin by generating a high‑level scaffold using ChatGPT, refine the architecture, integrate the Agora stack, and finish with a functioning live demo.

By the end, you’ll have a system that:

- Streams microphone audio with Agora RTC  
- Uses a ConvoAI agent to perform STT → LLM → TTS  
- Speaks back with OpenAI’s TTS models in real time  
- Behaves according to your custom agent prompt  
- Runs in a clean, Next.js environment

# Prerequisites

You should be familiar with:

- Basic JavaScript/TypeScript and React  
- REST APIs and environment variables  
- npm/yarn and basic Node.js project structure  
- Access to the Agora Console and an Agora developer account  

You'll need:

- An Agora project with **RTC** and **ConvoAI** enabled  
- An OpenAI API key (or another LLM provider supported by ConvoAI)
- QuickStart:
🔗 https://www.agora.io/en/blog/how-to-get-started-with-agora

---

# Project Setup

We’ll use a Next.js app with API routes and client components to wire everything together.

```bash
npx create-next-app@latest convoai-from-scratch
cd convoai-from-scratch
npm install agora-rtc-sdk-ng dotenv
```

Create a `.env.local` file:

```env
NEXT_PUBLIC_AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_cert
NEXT_PUBLIC_DEFAULT_CHANNEL=demo

AGORA_CUSTOMER_ID=your_convoai_client_id
AGORA_CUSTOMER_SECRET=your_convoai_client_secret

OPENAI_API_KEY=your_openai_key
OPENAI_LLM_MODEL=gpt-4o-mini
OPENAI_TTS_MODEL=gpt-4o-mini-tts
OPENAI_TTS_VOICE=alloy
```

**Important:** Always keep secrets **server‑side**. Only expose values via `NEXT_PUBLIC_*` when absolutely safe.

---

# Step 0: Use Prompt Engineering to Scaffold the Project

Before writing any code, we use ChatGPT as a **project architect**. This accelerates onboarding and clarifies which Agora components you actually need.

### Prompt 1 — Project Scaffold Generator

Paste into ChatGPT:

```
Create a Next.js project that implements a real-time voice AI agent using:
- Agora RTC for audio capture
- Agora Conversational AI Agent for voice-to-LLM-to-voice
- OpenAI for reasoning + TTS

Include:
- file structure
- API routes for starting/stopping an agent
- RTC client component
- environment variables
- "Start Voice Agent" UI button

The output does not need to be perfect—scaffolding is fine.
```

This gives you a rough—but highly useful—starting blueprint.

---

### Prompt 2 — System Behavior Prompt for the Agent

This defines your agent’s role and boundaries:

```
You are a real-time voice assistant helping a developer explore Agora’s Conversational AI Engine.
Your goals:
- Respond in 1–3 sentences.
- Explain Agora concepts clearly.
- If unsure, say so and provide guidance.
Tone: friendly, concise, technically accurate.
```

We’ll embed this prompt directly into the agent’s LLM config.

---

### Prompt 3 — Architecture Clarification

Use this when anything feels unclear:

```
Explain the exact data flow between Agora RTC, Agora ConvoAI Agent,
OpenAI LLM/TTS, and my frontend.
Represent each component with inputs, outputs, and events.
```

Use this high‑level clarity to avoid wiring mistakes later.

---

# System Architecture

The final system consists of four main components:

- **Agora RTC** – streams real-time microphone audio from browser → channel  
- **ConvoAI Agent** – listens to audio, transcribes, queries LLM, sends TTS audio back  
- **OpenAI** – GPT‑4o‑mini for reasoning + GPT‑4o‑mini‑tts for voice  
- **Next.js** – frontend + serverless API routes for agent orchestration  

```mermaid graph TD;
  User(Microphone Input) --> RTC[Agora RTC Engine]
  RTC --> Backend[Next.js API Routes]
  Backend --> Agent[ConvoAI Agent]
  Agent --> LLM[OpenAI GPT-4o-mini]
  LLM --> TTS[OpenAI TTS]
  TTS --> Agent
  Agent --> RTC
  RTC --> UI[Frontend UI Playback]
```

---

# Step 1: Join an Agora RTC Voice Channel

### Create RTC Client

```tsx
import { useEffect, useRef, useState } from "react";
import AgoraRTC from "agora-rtc-sdk-ng";

const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;
const CHANNEL = process.env.NEXT_PUBLIC_DEFAULT_CHANNEL || "demo";
const UID = Math.floor(Math.random() * 100000);

export default function RtcClient({ token }: { token: string }) {
  const [joined, setJoined] = useState(false);
  const clientRef = useRef(AgoraRTC.createClient({ mode: "rtc", codec: "vp8" }));

  useEffect(() => {
    if (!joined) return;

    const start = async () => {
      await clientRef.current.join(APP_ID, CHANNEL, token, UID);
      const micTrack = await AgoraRTC.createMicrophoneAudioTrack();
      await clientRef.current.publish([micTrack]);
      console.log("Joined RTC channel.");
    };

    start();
    return () => clientRef.current.leave();
  }, [joined]);

  return <button onClick={() => setJoined(true)}>Join Voice</button>;
}
```

**Tip:**  
Open the Agora Console → Usage → RTC and verify your UID appears.

---

# Step 2: Create & Start a ConvoAI Agent

Enable ConvoAI extension in the Agora dashboard:

1. Go to **Extensions**  
2. Enable **Conversational AI**  
3. Copy **Customer ID** and **Customer Secret**

### Create Agent Start Endpoint

`app/api/agent/start/route.ts`:

```ts
const AGENT_PROMPT = `
You are a real-time voice assistant helping a developer explore Agora’s Conversational AI Engine.
Keep responses short and technically accurate.
`;

export async function POST() {
  const payload = {
    channel: process.env.NEXT_PUBLIC_DEFAULT_CHANNEL,
    user_id: "bot",
    llm: {
      provider: "openai",
      model: process.env.OPENAI_LLM_MODEL,
      system_prompt: AGENT_PROMPT
    },
    tts: {
      model: process.env.OPENAI_TTS_MODEL,
      voice: process.env.OPENAI_TTS_VOICE
    }
  };

  const auth = Buffer.from(
    `${process.env.AGORA_CUSTOMER_ID}:${process.env.AGORA_CUSTOMER_SECRET}`
  ).toString("base64");

  const r = await fetch(
    `https://api.agora.io/conversational-ai-agent/v2/projects/${process.env.NEXT_PUBLIC_AGORA_APP_ID}/agents:join`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`
      },
      body: JSON.stringify(payload)
    }
  );

  return new Response(await r.text(), { status: r.status });
}
```

### Test the Agent

```bash
curl -X POST http://localhost:3000/api/agent/start
```

Check Agora Console → Usage → **Conversational AI** → Active Sessions.

---

# Step 3: Build the Live Voice → LLM → Voice Loop

### Combine RTC + Agent

```tsx
import { useEffect, useRef, useState } from "react";
import AgoraRTC from "agora-rtc-sdk-ng";

const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;
const CHANNEL = process.env.NEXT_PUBLIC_DEFAULT_CHANNEL!;
const UID = Math.floor(Math.random() * 100000);

export default function VoiceAgent({ token }: { token: string }) {
  const [status, setStatus] = useState("Idle");
  const clientRef = useRef(AgoraRTC.createClient({ mode: "rtc", codec: "vp8" }));

  const start = async () => {
    setStatus("Joining channel...");
    await clientRef.current.join(APP_ID, CHANNEL, token, UID);

    setStatus("Publishing mic...");
    const micTrack = await AgoraRTC.createMicrophoneAudioTrack();
    await clientRef.current.publish([micTrack]);

    setStatus("Starting agent...");
    const res = await fetch("/api/agent/start", { method: "POST" });
    if (!res.ok) return setStatus("Agent failed to start");

    setStatus("Agent connected — start talking!");
  };

  return (
    <div>
      <button onClick={start}>Start Voice Agent</button>
      <p>{status}</p>
    </div>
  );
}
```

Now your browser **speaks**, agent **listens**, LLM **thinks**, TTS **speaks back**, and Agora RTC handles the streaming in real time.

---

# Step 4: Add Optional UI Enhancements

Ask ChatGPT:

```
Add Tailwind styling to improve layout:
• centered card
• status indicator
• agent transcript panel
Keep logic unchanged.
```

LLMs excel here because the logic is already correct.

---

# Step 5: Test the Full Demo

1. Run the dev server.  
2. Click **Start Voice Agent**.  
3. Approve mic permissions.  
4. Speak.  
5. Hear the agent speak back within 1–2 seconds.  
6. Check dashboard for RTC + agent sessions.  
7. Reload page and ensure clean reconnect.

If all steps work → your real‑time voice agent is live!

---

# Conclusion

You’ve now built a real-time Voice AI Agent powered by Agora RTC + ConvoAI + OpenAI. You explored how LLM‑driven scaffolding accelerates development, how prompt engineering shapes agent behavior, and how modular validation keeps everything stable.

Next steps:

- Add captions/subtitles  
- Create multi-agent experiences  
- Add persistent memory  
- Deploy to Vercel  
- Integrate with a game or kiosk UI  

Useful links:

- GitHub Template: https://github.com/AgoraIO-Community/convoai-from-scratch  
- Conversational AI Docs: https://docs.agora.io/en/conversational-ai/  
- Agora Developer Blog: https://www.agora.io/en/category/developer/  

---
