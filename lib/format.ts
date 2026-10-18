export const LANG_COLOR: Record<string, string> = {
  TypeScript: "#6366F1",
  JavaScript: "#FACC15",
  Python: "#00F0FF",
  "Jupyter Notebook": "#F59E0B",
  "C++": "#F472B6",
  "C#": "#A78BFA",
  Java: "#FB923C",
  PHP: "#818CF8",
  HTML: "#F87171",
  Hack: "#878787",
};

const rel = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** "3 days ago" / "last month", relative to a fixed `now` so SSR and hydration agree. */
export function ago(iso: string | null, now: number): string | null {
  if (!iso) return null;
  const days = Math.round((new Date(iso).getTime() - now) / 86_400_000);
  if (Math.abs(days) < 1) return "today";
  if (Math.abs(days) < 30) return rel.format(days, "day");
  if (Math.abs(days) < 365) return rel.format(Math.round(days / 30), "month");
  return rel.format(Math.round(days / 365), "year");
}
