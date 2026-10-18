// Curated README screenshots: clean states, no cursor, intro and banners skipped.
import { chromium } from "playwright-core";
import fs from "node:fs";

const OUT = process.argv[2] ?? "docs/screenshots";
const BASE = process.argv[3] ?? "http://localhost:3000";
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: false,
  args: ["--window-position=-2600,-2600", "--hide-scrollbars", "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
});
const clean = () => {
  try {
    sessionStorage.setItem("aa:intro", "1");
    for (const l of ["es", "fr", "de", "ja", "bn"]) sessionStorage.setItem(`aa:langnotice:${l}`, "1");
  } catch {}
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = async (page, name, opts = {}) => {
  await page.screenshot({ path: `${OUT}/${name}.jpg`, type: "jpeg", quality: 90, ...opts });
  console.log("saved", name);
};
const toSection = async (page, id, offset = 0) => {
  await page.evaluate(([i, o]) => {
    const el = document.getElementById(i);
    if (el) window.scrollTo(0, el.getBoundingClientRect().top + scrollY + o);
  }, [id, offset]);
  await sleep(1600);
};

// ── desktop ──
{
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(clean);
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "load" });
  await sleep(4200);
  await page.mouse.move(1150, 450);
  await sleep(600);
  await shot(page, "01-hero");

  await page.locator('button[aria-pressed]', { hasText: /Defense/i }).click();
  await page.mouse.move(1150, 420);
  await sleep(2400);
  await shot(page, "02-hero-defense-mode");
  await page.locator('button[aria-pressed]', { hasText: /Neural/i }).click();

  await toSection(page, "about", 470);
  const portrait = page.locator('#about [role="img"][tabindex="0"]').first();
  const pb = await portrait.boundingBox();
  if (pb) await page.mouse.move(pb.x + pb.width / 2, pb.y + pb.height * 0.22);
  await sleep(3500);
  await shot(page, "03-about-portrait-scan");

  await toSection(page, "roadmap", 330);
  const node = page.locator('#roadmap svg g[role="button"]').nth(7);
  const nb = await node.boundingBox();
  if (nb) await page.mouse.move(nb.x + nb.width / 2, nb.y + nb.height / 2);
  await sleep(900);
  await shot(page, "04-roadmap");

  await toSection(page, "labs", 380);
  await page.locator("#labs button", { hasText: /Add rule/i }).click();
  const ports = page.locator('#labs input[aria-label^="Port"]');
  await ports.nth((await ports.count()) - 2).fill("22");
  await page.mouse.move(10, 10);
  await sleep(800);
  await shot(page, "05-lab-firewall");

  await page.locator('#labs [role="tab"]').nth(1).click();
  await sleep(1200);
  await shot(page, "06-lab-model-confidence");

  await page.locator('#labs [role="tab"]').nth(2).click();
  await sleep(400);
  await page.locator("#labs button", { hasText: /Run audit/i }).click();
  await sleep(1600);
  await shot(page, "07-lab-header-audit");

  await toSection(page, "research", 300);
  await page.locator("#research button", { hasText: /BibTeX/i }).first().click();
  await page.mouse.move(10, 10);
  await sleep(1000);
  await shot(page, "08-research");

  await toSection(page, "builds", 470);
  await shot(page, "09-builds");

  await toSection(page, "certifications", 380);
  await shot(page, "10-credentials");

  await toSection(page, "security", 600);
  await shot(page, "11-security");

  await toSection(page, "contact", 330);
  await page.fill("#contact-name", "Ada Lovelace");
  await page.fill("#contact-email", "ada@analytical.engine");
  await page.fill("#contact-message", "Loved the labs. Let's talk about a security research internship.");
  await sleep(2500);
  await shot(page, "12-contact");

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.keyboard.press("Backquote");
  await sleep(600);
  for (const cmd of ["security-audit", "certs"]) {
    await page.keyboard.type(cmd);
    await page.keyboard.press("Enter");
    await sleep(900);
  }
  await shot(page, "13-terminal");
  await page.keyboard.press("Escape");

  await page.goto(BASE + "/bn", { waitUntil: "load" });
  await sleep(4000);
  await page.mouse.move(10, 10);
  await shot(page, "14-bengali");
  await page.goto(BASE + "/ja", { waitUntil: "load" });
  await sleep(4000);
  await shot(page, "15-japanese");
  await page.goto(BASE + "/projects/security-assessment", { waitUntil: "load" });
  await sleep(2500);
  await shot(page, "16-case-study");
  await ctx.close();
}

// ── mobile ──
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.addInitScript(clean);
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "load" });
  await sleep(4200);
  await shot(page, "17-mobile-hero");
  await toSection(page, "roadmap", 200);
  await shot(page, "18-mobile-roadmap");
  await toSection(page, "labs", 300);
  await shot(page, "19-mobile-labs");
  await ctx.close();
}
await browser.close();
