// Fails (exit 1) if any locale file drifts from messages/en.json:
// missing/extra keys, empty strings, or mismatched {placeholders}.
import { readFileSync, readdirSync } from "node:fs";

const flat = (obj, prefix = "") =>
  Object.entries(obj).flatMap(([k, v]) => (v && typeof v === "object" ? flat(v, `${prefix}${k}.`) : [[`${prefix}${k}`, v]]));
const placeholders = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");

const en = new Map(flat(JSON.parse(readFileSync("messages/en.json", "utf8"))));
let problems = 0;
for (const file of readdirSync("messages").filter((f) => f.endsWith(".json") && f !== "en.json")) {
  const loc = new Map(flat(JSON.parse(readFileSync(`messages/${file}`, "utf8"))));
  for (const [k, v] of en) {
    if (!loc.has(k)) { console.error(`${file}: missing ${k}`); problems++; continue; }
    const lv = loc.get(k);
    if (typeof lv !== "string" || lv.trim() === "") { console.error(`${file}: empty ${k}`); problems++; }
    else if (placeholders(lv) !== placeholders(v)) { console.error(`${file}: placeholder mismatch in ${k} (${placeholders(v)} vs ${placeholders(lv)})`); problems++; }
  }
  for (const k of loc.keys()) if (!en.has(k)) { console.error(`${file}: unknown key ${k}`); problems++; }
}
if (problems) { console.error(`\n${problems} i18n problem(s).`); process.exit(1); }
console.log(`i18n OK: ${en.size} keys × ${readdirSync("messages").filter((f) => f.endsWith(".json")).length} locales, placeholders consistent.`);
