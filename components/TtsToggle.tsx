"use client";

export default function TtsToggle({
  enabled,
  onChange
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
      <input type="checkbox" checked={enabled} onChange={(e) => onChange(e.target.checked)} />
      <span>TTS enabled</span>
    </label>
  );
}