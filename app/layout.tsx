export const metadata = {
  title: "Agora Web + Conversational AI + TTS",
  description: "Next.js + Agora Web v4 + Conversational AI + TTS demo"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen" style={{ background: "#f8fafc", color: "#0f172a" }}>
        <header style={{ padding: "1rem", borderBottom: "1px solid #e2e8f0", background: "white" }}>
          <nav style={{ maxWidth: "960px", margin: "0 auto", display: "flex", gap: "1rem", alignItems: "center" }}>
            <a href="/" style={{ fontWeight: 600 }}>Home</a>
            <a href="/about" style={{ opacity: 0.8 }}>About</a>
          </nav>
        </header>
        <main style={{ maxWidth: "960px", margin: "0 auto", padding: "1rem" }}>{children}</main>
      </body>
    </html>
  );
}
