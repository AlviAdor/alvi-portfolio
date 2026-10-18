import Link from "next/link";

/*
 * Global (locale-less) not-found. Because the root layout is a pass-through,
 * this page renders its own minimal document. Locale-aware 404s inside the app
 * are handled by app/[locale]/not-found.tsx.
 */
export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#06080d", color: "#e6edf7", fontFamily: "ui-monospace, Menlo, monospace" }}>
        <main style={{ textAlign: "center", padding: "2rem" }}>
          <p style={{ fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", color: "#FF2E63" }}>signal lost · 404</p>
          <h1 style={{ fontSize: "2rem", margin: "1rem 0" }}>This node isn&apos;t on the map.</h1>
          <Link href="/" style={{ color: "#00F0FF" }}>
            ← Back to base
          </Link>
        </main>
      </body>
    </html>
  );
}
