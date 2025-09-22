type Line = { ts: string; speaker: "agent" | "user" | "system"; text: string };

// In-memory store (ephemeral in serverless). For production, use a DB or kv.
const CAPTIONS: Line[] = [];

export function addCaption(line: Line) {
  CAPTIONS.push(line);
  if (CAPTIONS.length > 200) CAPTIONS.splice(0, CAPTIONS.length - 200);
}

export function getCaptions(sinceIso?: string) {
  if (!sinceIso) return CAPTIONS.slice(-50);
  const since = Date.parse(sinceIso);
  return CAPTIONS.filter(l => Date.parse(l.ts) > since).slice(-50);
}