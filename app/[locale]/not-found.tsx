import { Link } from "@/i18n/navigation";

export default function NotFound() {
  return (
    <main className="blueprint grid min-h-[100svh] place-items-center px-6">
      <div className="glass noise max-w-md p-10 font-mono">
        <p className="text-[10px] tracking-[0.2em] text-flare uppercase">signal lost · 404</p>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight">This node isn&apos;t in the graph.</h1>
        <Link href="/" className="mt-8 inline-block border border-neon/50 px-5 py-2.5 text-xs tracking-[0.14em] text-neon uppercase hover:bg-neon hover:text-obsidian">
          ← Back to base
        </Link>
      </div>
    </main>
  );
}
