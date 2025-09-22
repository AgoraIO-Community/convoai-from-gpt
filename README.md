# Agora DevRel Sample UI/Convo - Vernon Marshall

## Quickstart (Local Development)

1. **Unzip & Enter**
   ```bash
   git clone https://github.com/vmarshall/agora-devrel-vmarshall
   cd agora-devrel-vmarshall
   ```

2. **Configure Environment Variables**
   ```bash
   cp .env.local.example .env.local
   ```
   Then edit `.env.local` and set:
   - **Agora**:
     - `NEXT_PUBLIC_AGORA_APP_ID` — your Agora App ID
     - `AGORA_APP_CERTIFICATE` — your Agora App Certificate
     - `AGORA_RTC_TOKEN_TTL` — token lifetime in seconds (default: `3600`)
   - **Agora Conversational AI Engine** (Basic Auth):
     - `AGORA_CUSTOMER_ID` — your Customer ID
     - `AGORA_CUSTOMER_SECRET` — your Customer Secret
   - **OpenAI**:
     - `OPENAI_API_KEY` — your OpenAI API key
     - `OPENAI_LLM_MODEL` — (optional) chat model, default `gpt-4o-mini`
     - `OPENAI_TTS_MODEL` — (optional) default `gpt-4o-mini-tts`
     - `OPENAI_TTS_VOICE` — (optional) default `alloy`
   - **Optional**:
     - `NEXT_PUBLIC_DEFAULT_CHANNEL` — default channel name, e.g. `devrel-demo`

3. **Install & Run**
   ```bash
   npm install
   npm run dev
   # open http://localhost:3000
   ```


4. ** Deploy to Vercel**
   ```bash
   # add env vars in Project → Settings → Environment Variables
   
   vercel --prod
   ```
---

## Architecture and Caveats

    - bug in the agentid widget when LLM is connected
    - created a Agora video widget, but didn't have time to connect TTS to animation
    - the captioning isn't really necessary and isn't grabbing both streams. It was more for my testing than anything because the audio portion works fine


## Usage Flow

1. **Join** — token minted via `/api/token`; client publishes mic.
2. **Start Agent** — server calls Agora **/join** with LLM+TTS config; stores `agent_id`.
3. **Type in Chat** — client sends your text to **`/api/agent/text`**:
   - Server calls **OpenAI Chat** to get `aiText`.
   - If **TTS enabled**, server calls **/speak** to voice `aiText` from the agent.
   - Chat UI shows your text + `aiText`.
4. **Stop Agent** — demo route is a no-op (adjust to your plan’s leave endpoint if needed).

---

## API Endpoints

- `POST /api/token` — Mint RTC token (server-only).
- `POST /api/agent/start` — Join agent to channel using **v2 join** (includes `llm` + `tts`).
- `POST /api/agent/text` — Text → OpenAI → (optional) agent **/speak**.
- `POST /api/agent/stop` — Placeholder; wire to your leave endpoint if required.
- `POST /api/tts/speak` — Direct OpenAI TTS to base64 MP3 (used only for client-side testing).

---

## Deploy to Vercel

- Import repo → Next.js auto-detected.
- Add all env vars in **Project → Settings → Environment Variables** (Production & Preview).
- Build: `next build` (default).

---

## Troubleshooting

- **Agent join 401** — wrong `AGORA_CUSTOMER_ID/SECRET` (Basic Auth).
- **500 with 'output_modalities'** — missing `llm` or `tts` blocks in join payload.
- **No voice when typing** — ensure **TTS enabled** toggle is on; check `/api/agent/text` response.
- **Speak 404** — use the exact path: `/api/conversational-ai-agent/v2/projects/{APP_ID}/agents/{agentId}/speak`.

## Stopping the Agent
The **Stop Agent** button now calls `/api/agent/stop` with the `agentId` returned from `/api/agent/start`.
This tells Agora to make the agent leave the channel immediately.


### Agent Stop
`POST /api/agent/stop` now requires `{ agentId }` and calls:
`/api/conversational-ai-agent/v2/projects/{APP_ID}/agents/{agentId}/leave` (Basic Auth).


---

## Voice Path (ASR → LLM → TTS)
- Agent now uses **OpenAI ASR** (`gpt-4o-mini-transcribe` by default) with the same `OPENAI_API_KEY`.
- The client subscribes to **remote audio** and plays it automatically, so you'll hear the agent when it speaks.
- To change ASR model, set `OPENAI_ASR_MODEL` in your env.


---

## Captions
- A **Captions** panel now displays text lines.
- For typed chat (Option A), the server adds the AI reply to captions automatically.
- Two routes are provided for **voice captions** integration:
  - `POST /api/agent/captions/ingest` — accept `{ text, speaker?, ts? }` to append a caption.
  - `GET /api/agent/captions/poll?since=ISO` — poll recent captions.
> In production, point the **ingest** route to your Agora webhook (or your own relay that consumes agent events) and persist to a DB.


---

## Webhook → Captions
A minimal webhook endpoint is available at **POST `/api/agent/webhook`**.

- Optional secret: set `WEBHOOK_SHARED_SECRET` in your environment and send it as the header `X-Webhook-Secret`.
- Body is flexible; the route tries to pull text from `text`, `message`, `result.text`, or `data.text` and a speaker from `speaker`, `role`, or `from`.
- On success, a caption line is appended to the in-memory store (see `app/api/agent/captions/_store.ts`).

**Example cURL**
```bash
curl -X POST https://<your-vercel-app>/api/agent/webhook \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: $WEBHOOK_SHARED_SECRET" \
  -d '{ "text": "This is a caption line", "speaker": "agent" }'
```

> In production, replace the in-memory store with a database or KV and wire this endpoint to Agora callbacks to stream ASR/LLM text into captions in real time.


---

## Agent History → Captions (no webhook needed)
The UI now polls **`GET /api/agent/history?agentId=...`** every ~2s while the agent is running and merges any text items into the Captions panel. This ensures your **spoken** interactions (ASR→LLM output) appear as text even if you haven't wired webhooks yet.
- Change the polling cadence or remove it if you prefer webhooks-only.
- De-duplication is done client-side by a simple `{speaker|ts|text}` key.



