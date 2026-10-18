// Walkthrough recorder: CDP screencast (high-quality JPEG frames with wall-clock
// timestamps) + a scripted tour whose scenes dwell exactly as long as the
// pre-rendered narration for each beat. Emits frames/ and timeline.json.
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const VIDEO = process.argv[2] ?? path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../.media-work");
const BASE = process.argv[3] ?? "http://localhost:3000";
const FRAMES = path.join(VIDEO, "frames");
fs.rmSync(FRAMES, { recursive: true, force: true });
fs.mkdirSync(FRAMES, { recursive: true });
const durations = JSON.parse(fs.readFileSync(path.join(VIDEO, "durations.json"), "utf8"));

const W = 1920, H = 1080;
const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: false,
  args: ["--window-position=-2600,-2600", `--window-size=${W},${H + 120}`, "--hide-scrollbars", "--force-device-scale-factor=1"],
});
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });

// Presentation cursor: a soft ring that follows the mouse and ripples on click.
await ctx.addInitScript(() => {
  const mount = () => {
    if (document.getElementById("__rec_cursor")) return;
    const c = document.createElement("div");
    c.id = "__rec_cursor";
    c.style.cssText = "position:fixed;left:0;top:0;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;border:2px solid rgba(230,237,247,.95);background:rgba(0,240,255,.18);box-shadow:0 0 18px rgba(0,240,255,.55);pointer-events:none;z-index:2147483647;transition:transform .12s ease,background .12s ease;transform:translate(-100px,-100px)";
    document.documentElement.appendChild(c);
    let x = -100, y = -100;
    addEventListener("mousemove", (e) => { x = e.clientX; y = e.clientY; c.style.transform = `translate(${x}px,${y}px)`; }, true);
    addEventListener("mousedown", () => {
      c.style.background = "rgba(0,240,255,.55)";
      const r = document.createElement("div");
      r.style.cssText = `position:fixed;left:${x - 4}px;top:${y - 4}px;width:8px;height:8px;border-radius:50%;border:2px solid rgba(0,240,255,.9);pointer-events:none;z-index:2147483646;transition:all .5s ease-out;opacity:1`;
      document.documentElement.appendChild(r);
      requestAnimationFrame(() => { r.style.transform = "scale(7)"; r.style.opacity = "0"; });
      setTimeout(() => r.remove(), 600);
    }, true);
    addEventListener("mouseup", () => { c.style.background = "rgba(0,240,255,.18)"; }, true);
  };
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", mount); else mount();
  // keep the walkthrough clean: no language-notice banner
  try { for (const l of ["es", "fr", "de", "ja", "bn"]) sessionStorage.setItem(`aa:langnotice:${l}`, "1"); } catch {}
});

const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
const frames = [];
let n = 0;
cdp.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
  const file = path.join(FRAMES, `${String(n++).padStart(6, "0")}.jpg`);
  fs.writeFileSync(file, Buffer.from(data, "base64"));
  frames.push({ file, ts: metadata.timestamp });
  cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
});
const startCast = () => cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: W, maxHeight: H, everyNthFrame: 1 }).catch(() => {});
page.on("framenavigated", (f) => { if (f === page.mainFrame()) void startCast(); });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const now = () => Date.now() / 1000;
const scenes = [];
let cursor = { x: W / 2, y: H / 2 };

async function glide(x, y, ms = 700) {
  const steps = Math.max(8, Math.round(ms / 16));
  const sx = cursor.x, sy = cursor.y;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // easeInOutQuad
    await page.mouse.move(sx + (x - sx) * e, sy + (y - sy) * e);
    await sleep(ms / steps);
  }
  cursor = { x, y };
}
async function glideTo(locator, ms = 700, dx = 0.5, dy = 0.5) {
  const b = await locator.boundingBox();
  if (!b) return null;
  await glide(b.x + b.width * dx, b.y + b.height * dy, ms);
  return b;
}
async function clickAt(locator, ms = 650) {
  const b = await glideTo(locator, ms);
  if (!b) return;
  await page.mouse.down(); await sleep(90); await page.mouse.up();
}
// Natural scroll through Lenis: wheel events spread over time, then settle.
async function scrollToId(id, ms = 1600, offset = 0) {
  const target = await page.evaluate(([i, o]) => { const el = document.getElementById(i); return el ? el.getBoundingClientRect().top + scrollY + o : null; }, [id, offset]);
  if (target == null) return;
  const steps = Math.round(ms / 24);
  for (let i = 0; i < steps; i++) {
    const remaining = target - (await page.evaluate(() => scrollY));
    if (Math.abs(remaining) < 4) break;
    await page.mouse.wheel(0, remaining / Math.max(2, (steps - i) / 1.6));
    await sleep(24);
  }
  await sleep(500);
}
async function scene(id, fn, pad = 0.55) {
  const start = now();
  scenes.push({ id, start });
  await fn();
  const need = (durations[id] ?? 0) + pad - (now() - start);
  if (need > 0) await sleep(need * 1000);
}

// ── tour ─────────────────────────────────────────────────────────────────
await page.goto("about:blank");
await startCast();
await sleep(400);

await scene("hook", async () => {
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await glide(W * 0.58, H * 0.5, 300);
  await sleep(2400); // multilingual greeting plays, then the hero builds in
});
await scene("intro", async () => {
  await glide(W * 0.62, H * 0.42, 1300);
  await glide(W * 0.7, H * 0.6, 1100);
  await page.mouse.down(); await sleep(90); await page.mouse.up(); // shockwave
  await sleep(800);
  await glide(W * 0.55, H * 0.48, 1200);
});
await scene("modes", async () => {
  await clickAt(page.locator('button[aria-pressed]', { hasText: /Defense/i }), 900);
  await sleep(2600);
  await glideTo(page.locator("text=/Live security posture/i").first(), 1100);
  await glide(cursor.x + 60, cursor.y + 140, 1800);
});
await scene("portrait", async () => {
  await scrollToId("about", 1700, 420);
  await glideTo(page.locator('#about [role="img"][tabindex="0"]').first(), 900, 0.5, 0.22);
  await sleep(1800);
  await glide(cursor.x + 30, cursor.y + 60, 1200);
});
await scene("roadmap", async () => {
  await scrollToId("roadmap", 1700, 330);
  const nodes = page.locator('#roadmap svg g[role="button"]');
  for (const i of [0, 1, 3, 4, 7, 10, 12]) {
    await glideTo(nodes.nth(i), 650);
    await sleep(850);
  }
});
await scene("firewall", async () => {
  await scrollToId("labs", 1700, 380);
  await clickAt(page.locator("#labs button", { hasText: /Add rule/i }), 900);
  await sleep(500);
  const ports = page.locator('#labs input[aria-label^="Port"]');
  const target = ports.nth((await ports.count()) - 2);
  await clickAt(target, 700);
  await page.keyboard.press("Meta+A");
  await page.keyboard.type("22", { delay: 180 });
  await sleep(600);
  await glideTo(page.locator("#labs li", { hasText: "SSH" }).first(), 900);
  await sleep(1200);
  await glideTo(page.locator("#labs", { hasText: "over-exposed" }).locator("text=/over-exposed/").first(), 900);
});
await scene("fer", async () => {
  await clickAt(page.locator('#labs [role="tab"]').nth(1), 800);
  await sleep(700);
  const slider = page.locator('#labs input[type="range"]').first();
  const b = await slider.boundingBox();
  if (b) {
    const at = (v) => b.x + b.width * ((v - 0.1) / (0.95 - 0.1));
    await glide(at(0.5), b.y + b.height / 2, 700);
    await page.mouse.down();
    for (const v of [0.55, 0.62, 0.7]) { await glide(at(v), b.y + b.height / 2, 450); }
    await sleep(900);
    for (const v of [0.6, 0.48, 0.4]) { await glide(at(v), b.y + b.height / 2, 450); }
    await page.mouse.up();
  }
});
await scene("headers", async () => {
  await clickAt(page.locator('#labs [role="tab"]').nth(2), 800);
  await sleep(500);
  await clickAt(page.locator("#labs button", { hasText: /Run audit/i }), 700);
  await sleep(1300);
  await glideTo(page.locator("#labs").locator("text=/^A\\+$/").first(), 800);
});
await scene("research", async () => {
  await scrollToId("research", 1700, 300);
  await clickAt(page.locator("#research button", { hasText: /BibTeX/i }).first(), 900);
  await sleep(1500);
});
await scene("builds", async () => {
  await scrollToId("builds", 1600, 470);
  await glideTo(page.locator("#builds a[href*='/projects/']").first(), 900);
  await sleep(1300);
  await scrollToId("builds", 1400, 1500);
  await glideTo(page.locator('#builds [role="grid"]').first(), 900, 0.8, 0.5);
});
await scene("certs", async () => {
  await scrollToId("certifications", 1600, 380);
  await glideTo(page.locator("#certifications article").first(), 900, 0.35, 0.4);
  await glide(cursor.x + 220, cursor.y + 40, 1100);
});
await scene("lang", async () => {
  await clickAt(page.locator('button[aria-label="Language"]').first(), 900);
  await sleep(500);
  await clickAt(page.locator('[role="option"]', { hasText: "বাংলা" }), 700);
  await page.waitForURL(/\/bn$/, { timeout: 10000 }).catch(() => {});
  await sleep(1500);
  await glide(W * 0.4, H * 0.5, 900);
});
await scene("terminal", async () => {
  await page.keyboard.press("Backquote");
  await sleep(600);
  for (const cmd of ["security-audit", "certs"]) {
    await page.keyboard.type(cmd, { delay: 70 });
    await page.keyboard.press("Enter");
    await sleep(1100);
  }
  await page.keyboard.type("langs en", { delay: 70 });
  await page.keyboard.press("Enter");
  await page.waitForURL((u) => !/\/bn$/.test(String(u)), { timeout: 10000 }).catch(() => {});
  await sleep(600);
});
await scene("contact", async () => {
  await scrollToId("contact", 1800, 330);
  await clickAt(page.locator("#contact-name"), 700);
  await page.keyboard.type("Ada Lovelace", { delay: 55 });
  await clickAt(page.locator("#contact-email"), 600);
  await page.keyboard.type("ada@analytical.engine", { delay: 40 });
  await clickAt(page.locator("#contact-message"), 600);
  await page.keyboard.type("Loved the labs. Let's talk about a security research internship.", { delay: 26 });
});
await scene("outro", async () => {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await sleep(1600);
  await clickAt(page.locator('button[aria-pressed]', { hasText: /Neural/i }), 900);
  await glide(W * 0.62, H * 0.5, 1400);
}, 1.2);

const end = now();
await cdp.send("Page.stopScreencast").catch(() => {});
await sleep(300);
fs.writeFileSync(path.join(VIDEO, "timeline.json"), JSON.stringify({ scenes, end, frames }, null, 0));
console.log(`frames: ${frames.length} · span ${(frames.at(-1).ts - frames[0].ts).toFixed(1)}s · scenes ${scenes.length}`);
await browser.close();
