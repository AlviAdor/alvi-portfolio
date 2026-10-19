#!/usr/bin/env node
/*
 * Post-deploy smoke test. No dependencies; Node ≥ 20.
 *
 *   node scripts/smoke-test.mjs http://localhost:3000
 *   node scripts/smoke-test.mjs https://alviador.is-a.dev
 *   node scripts/smoke-test.mjs https://alviador.is-a.dev --rate-limit   # also proves 429 (spends API quota)
 *
 * Prints PASS/FAIL per check and exits 1 if anything failed, so an agent or CI
 * can act on the exit code alone.
 */

const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const testRateLimit = process.argv.includes("--rate-limit");
const isLocal = /localhost|127\.0\.0\.1/.test(base);

let failed = 0;
const results = [];
const check = async (name, fn) => {
  try {
    const detail = await fn();
    results.push(["PASS", name, detail ?? ""]);
  } catch (err) {
    failed++;
    results.push(["FAIL", name, err instanceof Error ? err.message : String(err)]);
  }
};
const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};
const get = (path, init) => fetch(base + path, { redirect: "manual", ...init });
const sameOrigin = { origin: base, "sec-fetch-site": "same-origin" };

// ── pages ─────────────────────────────────────────────────────────────────
for (const loc of ["", "es", "fr", "de", "ja", "bn"]) {
  await check(`page /${loc}`, async () => {
    const r = await get(`/${loc}`);
    assert(r.status === 200, `status ${r.status}`);
    const html = await r.text();
    const lang = html.match(/<html[^>]*lang="([^"]+)"/)?.[1];
    assert(lang && lang.startsWith(loc || "en"), `html lang="${lang}"`);
    return `lang=${lang}`;
  });
}
for (const slug of ["secure-auth-demo", "security-assessment", "cnn-custom-dataset", "ans-hospital", "dx-ball"]) {
  await check(`case study /projects/${slug}`, async () => {
    const r = await get(`/projects/${slug}`);
    assert(r.status === 200, `status ${r.status}`);
  });
}
await check("unknown project → 404", async () => assert((await get("/projects/does-not-exist")).status === 404, "not 404"));
await check("unknown page → 404", async () => assert((await get("/definitely-not-a-page")).status === 404, "not 404"));

// ── security headers + CSP nonce ───────────────────────────────────────────
await check("security headers present", async () => {
  const r = await get("/");
  const need = ["content-security-policy", "strict-transport-security", "x-frame-options", "x-content-type-options", "referrer-policy", "permissions-policy", "cross-origin-opener-policy"];
  const missing = need.filter((h) => !r.headers.get(h));
  assert(missing.length === 0, `missing: ${missing.join(", ")}`);
  return `${need.length}/${need.length}`;
});
await check("CSP nonce is per-request and matches the HTML", async () => {
  const a = await get("/");
  const b = await get("/");
  const nonceOf = (r) => r.headers.get("content-security-policy")?.match(/'nonce-([^']+)'/)?.[1];
  const na = nonceOf(a);
  const nb = nonceOf(b);
  assert(na && nb, "no nonce in CSP header");
  assert(na !== nb, "nonce repeated across requests (page is being served statically)");
  const html = await a.text();
  assert(html.includes(`nonce="${na}"`), "HTML scripts don't carry the header's nonce");
  assert(/strict-dynamic/.test(a.headers.get("content-security-policy") ?? ""), "no strict-dynamic");
  return "unique + matching";
});
await check("CSP has no 'unsafe-inline' for scripts", async () => {
  const csp = (await get("/")).headers.get("content-security-policy") ?? "";
  const scriptSrc = csp.split(";").find((d) => d.trim().startsWith("script-src")) ?? "";
  assert(!scriptSrc.includes("'unsafe-inline'"), scriptSrc.trim());
});

// ── APIs ───────────────────────────────────────────────────────────────────
let status;
await check("GET /api/status", async () => {
  const r = await get("/api/status");
  assert(r.status === 200, `status ${r.status}`);
  status = await r.json();
  assert(status.csp === "nonce", "csp != nonce");
  return Object.entries(status)
    .filter(([k]) => k !== "checkedAt")
    .map(([k, v]) => `${k}=${v}`)
    .join(" ");
});
await check("GET /api/github", async () => {
  const r = await get("/api/github");
  assert(r.status === 200, `status ${r.status} (502 = GitHub unreachable or rate-limited; set GITHUB_TOKEN)`);
  const d = await r.json();
  assert(Array.isArray(d.repos) && d.repos.length > 0, "no repos");
  return `${d.repos.length} repos, ${d.totalCommits} commits, source=${d.activitySource}`;
});
await check("GET /api/research", async () => {
  const r = await get("/api/research");
  assert(r.status === 200, `status ${r.status}`);
  const d = await r.json();
  assert(d.papers.length > 0, "no papers");
  return `${d.papers.length} papers, datacite=${d.sources.datacite} openalex=${d.sources.openalex}`;
});
await check("GET /api/research?format=bib", async () => {
  const r = await get("/api/research?format=bib");
  assert(r.status === 200, `status ${r.status}`);
  assert((await r.text()).trim().startsWith("@"), "not BibTeX");
});

// ── contact pipeline (never sends a real email) ────────────────────────────
await check("contact: cross-origin POST blocked (403)", async () => {
  const r = await get("/api/contact", { method: "POST", headers: { "content-type": "application/json", origin: "https://evil.example", "sec-fetch-site": "cross-site" }, body: "{}" });
  assert(r.status === 403, `status ${r.status}`);
});
await check("contact: wrong content-type rejected (415)", async () => {
  const r = await get("/api/contact", { method: "POST", headers: { "content-type": "text/plain", ...sameOrigin }, body: "x" });
  assert(r.status === 415, `status ${r.status}`);
});
await check("contact: markup sanitised, invalid fields rejected (422 or bot-check 403)", async () => {
  // behave like a real client: get a signed form token, wait out the 2.5 s human minimum
  const { token } = await (await get("/api/contact", { headers: sameOrigin })).json();
  if (token) await new Promise((r) => setTimeout(r, 2700));
  const r = await get("/api/contact", { method: "POST", headers: { "content-type": "application/json", ...sameOrigin }, body: JSON.stringify({ name: "<b>A</b>", email: "bad", message: "short", formToken: token ?? undefined }) });
  const d = await r.json();
  // with Turnstile on, the bot check runs first and answers 403 before field validation
  assert(r.status === 422 || (r.status === 403 && d.error === "bot-check"), `status ${r.status} ${JSON.stringify(d)}`);
  if (r.status === 422) assert(d.fieldErrors?.name === "name.short", "markup was not stripped from name");
  return r.status === 422 ? "422, <b>A</b> → A" : "403 bot-check (Turnstile on)";
});
await check("contact: form token endpoint", async () => {
  const r = await get("/api/contact", { headers: sameOrigin });
  assert(r.status === 200, `status ${r.status}`);
  const d = await r.json();
  if (status?.formTokens) assert(typeof d.token === "string" && d.token.includes("."), "formTokens on but no signed token");
  return status?.formTokens ? "signed token issued" : "tokens disabled (set FORM_TOKEN_SECRET)";
});

// ── optional: prove rate limiting ──────────────────────────────────────────
if (testRateLimit) {
  await check("rate limit returns 429 with Retry-After", async () => {
    for (let i = 0; i < 25; i++) {
      const r = await get("/api/status");
      if (r.status === 429) {
        assert(r.headers.get("retry-after"), "429 without Retry-After");
        return `429 after ${i + 1} requests`;
      }
    }
    throw new Error("no 429 within 25 requests");
  });
}

// ── production-only expectations ───────────────────────────────────────────
if (!isLocal) {
  await check("production: HTTPS + HSTS preload", async () => {
    assert(base.startsWith("https://"), "not https");
    assert(/preload/.test((await get("/")).headers.get("strict-transport-security") ?? ""), "no HSTS preload");
  });
  await check("production: all protections switched on", async () => {
    const off = ["turnstile", "formTokens", "relay"].filter((k) => status && status[k] !== true);
    if (status?.rateLimit !== "upstash") off.push("rateLimit=upstash");
    assert(off.length === 0, `not configured: ${off.join(", ")} (see docs/JARVIS_DEPLOY.md, phase 3)`);
  });
}

// ── report ─────────────────────────────────────────────────────────────────
const width = Math.max(...results.map(([, n]) => n.length));
for (const [res, name, detail] of results) console.log(`${res === "PASS" ? "✓ PASS" : "✗ FAIL"}  ${name.padEnd(width)}  ${detail}`);
console.log(`\n${results.length - failed}/${results.length} passed against ${base}`);
process.exit(failed ? 1 : 0);
