export default function AboutPage() {
  return (
    <section>
      <h1>About</h1>
      <p>
        This demo integrates Agora Web SDK v4.x for real-time audio/video and
        Agora Conversational AI Engine for a live agent. It includes a TTS toggle,
        verbose debug console, and a clean join/control UI.
      </p>
      <ul>
        <li>Join channel & publish mic/video with RTC token (server-minted)</li>
        <li>Start/Stop Conversational AI Agent via server routes</li>
        <li>Text chat with optional TTS (server-side Agent Speak)</li>
        <li>Verbose logs for RTC, REST, and TTS actions</li>
      </ul>
      <p>See the README for setup and deployment instructions (Vercel preferred).</p>
    </section>
  );
}
