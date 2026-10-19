# Alvi Ador: Cybersecurity × AI Portfolio

Personal site for **Md. Faizal Alvi Sarker (Alvi Ador)**: cybersecurity & DevSecOps engineering, and AI / computer-vision research.

Next.js 15 (App Router, Server Components, Server Actions) · React 19 · next-intl (6 languages) · three.js / React Three Fiber / custom GLSL · GSAP + Lenis · Zustand · Tailwind CSS v4 · Resend · Upstash · Cloudflare Turnstile · MediaPipe (in-browser).

> **Deploying?** Follow [`docs/JARVIS_DEPLOY.md`](docs/JARVIS_DEPLOY.md): a step-by-step runbook (written so an assistant like Jarvis can execute it) covering accounts, secrets, Vercel, the free `alviador.is-a.dev` domain, and a post-deploy bug check.

![Hero](docs/screenshots/01-hero.jpg)

## Walkthrough

A 2:12 narrated tour with subtitles lives in [`media/walkthrough/`](media/walkthrough/): a social cut with captions burned in, a clean cut with a toggleable subtitle track, `.srt`/`.vtt` captions, a thumbnail, and a [publishing kit](media/walkthrough/PUBLISHING.md) (titles, description, chapters, LinkedIn post). The `.mp4` files are git-ignored because of their size; upload them to YouTube/LinkedIn and link them here. To re-render after changes, follow [`scripts/media/REPRODUCE.md`](scripts/media/REPRODUCE.md).

## Screenshots

| | |
|---|---|
| ![Defense mode](docs/screenshots/02-hero-defense-mode.jpg) **Hero, Defense mode** with live security posture | ![Portrait scan](docs/screenshots/03-about-portrait-scan.jpg) **Portrait face scan**, background swapped in-browser |
| ![Roadmap](docs/screenshots/04-roadmap.jpg) **Academic & merit roadmap** | ![Firewall lab](docs/screenshots/05-lab-firewall.jpg) **Lab: firewall policy sandbox** |
| ![Model confidence](docs/screenshots/06-lab-model-confidence.jpg) **Lab: model-confidence threshold** | ![Header audit](docs/screenshots/07-lab-header-audit.jpg) **Lab: live header audit (A+)** |
| ![Research](docs/screenshots/08-research.jpg) **Research, synced with BibTeX** | ![Builds](docs/screenshots/09-builds.jpg) **Case studies** |
| ![Credentials](docs/screenshots/10-credentials.jpg) **Credentials: verified vs. in preparation** | ![Security](docs/screenshots/11-security.jpg) **Security deep dives** |
| ![Contact](docs/screenshots/12-contact.jpg) **Hardened contact form** | ![Terminal](docs/screenshots/13-terminal.jpg) **Terminal: `security-audit`, `certs`** |
| ![Bengali](docs/screenshots/14-bengali.jpg) **বাংলা** | ![Japanese](docs/screenshots/15-japanese.jpg) **日本語** |

<p>
  <img src="docs/screenshots/17-mobile-hero.jpg" width="250" alt="Mobile hero">
  <img src="docs/screenshots/18-mobile-roadmap.jpg" width="250" alt="Mobile roadmap">
  <img src="docs/screenshots/19-mobile-labs.jpg" width="250" alt="Mobile labs">
</p>

---

## Run locally

```bash
npm install
cp .env.example .env.local     # fill in what you need; everything degrades gracefully
npm run dev                    # http://localhost:3000
```

| Script | What it does |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` / `npm start` | Production build / serve |
| `npm run typecheck` | `tsc --noEmit` (strict, `noUncheckedIndexedAccess`) |
| `npm run lint` | ESLint |
| `npm run check:i18n` | Every locale has the same keys and `{placeholders}` as English |
| `npm run verify` | All of the above plus a production build: the same gate CI runs |

Node ≥ 20.9.

## What's on the page

| # | Section | Notes |
|---|---|---|
| — | Hero | WebGL particle field with **Neural / Defense** modes, live security-posture panel (from `/api/status`) |
| 01 | About | WebGL portrait with face scan and in-browser background segmentation; security + AI tracks; field notes |
| 02 | Roadmap | Interactive merit graph: SSC → HSC → IELTS → AIUB, then security and AI lanes; goals in a separate dashed lane |
| 03 | Labs | Three safe, in-browser widgets: firewall policy sandbox, model-confidence threshold (optional on-device camera), live audit of this site's headers |
| 04 | Research | Synced from DataCite (ResearchGate DOIs) + OpenAlex, live BibTeX |
| 05 | Builds | Eight case studies (`/projects/[slug]`), live GitHub commit matrix, other repos |
| 06 | Credentials | Holographic cards. **Only verified credentials are shown as earned** (Cisco Ethical Hacker, IELTS); Security+, CEH and TryHackMe sit in a labelled "In preparation" rail |
| 07 | Security | Method + four deep-dive pillars, linked to the Secure Auth Demo |
| 08 | Skills | 3D force-directed skill graph |
| 09 | Contact | Hardened form (below), optional end-to-end encrypted channel |

Press <kbd>`</kbd> anywhere for the terminal (`help`, `roadmap`, `certs`, `security-audit`, `langs ja`, …).

## Languages

English, Español, Français, Deutsch, 日本語 and বাংলা, via `next-intl` with locale-prefixed routes (`/`, `/fr`, `/bn/projects/…`). Japanese and Bengali glyphs come from self-hosted Noto fallbacks.

**Scope, stated plainly:** the interface, hero, roadmap, labs, credentials, contact, footer and terminal are fully translated (260 strings × 6). The long-form narrative (About story, research summaries, case-study write-ups, security pillar text) stays in English, and non-English visitors see a one-time notice saying so. Translations are machine-assisted; have a native speaker review them before relying on them, especially Japanese and Bengali.

Edit strings in `messages/<locale>.json`; `npm run check:i18n` catches missing keys and broken placeholders.

## Security architecture

| Layer | Implementation |
|---|---|
| CSP | Per-request nonce + `strict-dynamic`, minted in `middleware.ts`; Next stamps it on its own scripts. Pages therefore render per request (data stays cached at the fetch layer) |
| Headers | HSTS (preload), X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy (camera only for this origin), COOP `same-origin-allow-popups`, CORP |
| Rate limiting | Upstash Redis token buckets (10 req/min/IP on every API; 3 delivered emails / 10 min); in-memory fallback. IPs are hashed before use |
| Bot check | Cloudflare Turnstile, verified server-side with idempotency keys |
| Form integrity | HMAC-SHA256 signed, single-use form tokens (min age 2.5 s, max 2 h, replay-blocked) |
| Input | DOMPurify (strip all markup) → NFKC → control-char strip → Zod strict schema → honeypot |
| Origin | Same-origin enforced on `/api/contact` (`Origin` + `Sec-Fetch-Site`); Server Actions get Next's built-in check |
| Supply chain | CI gate on production `npm audit`, CodeQL (`security-extended`), gitleaks secret scan, Dependabot. Next's nested PostCSS is overridden to a patched 8.x |

Every one of these is inspectable live: `/api/status` reports which are active (no secrets), and the **Labs → This site's headers** widget audits the response headers in the browser.

## API

| Route | Runtime | Returns |
|---|---|---|
| `GET /api/status` | edge | Security posture (booleans only) |
| `GET /api/github` | edge | Repos + 26-week commit matrix |
| `GET /api/research[?format=bib]` | edge | Papers (JSON) or all citations as `.bib` |
| `GET /api/contact` | node | A fresh HMAC form token |
| `POST /api/contact` | node | The full contact pipeline (JSON); the site's own form uses the Server Action |

All API routes are rate-limited and send `X-RateLimit-*` / `Retry-After` headers.

## Edit the content

| File | What lives there |
|---|---|
| `lib/site.ts` | Identity, links, story, security pillars, curated research, skill graph |
| `lib/projects.ts` | The eight case studies |
| `lib/education.ts` | Roadmap nodes (facts; text is in `messages/`) |
| `lib/credentials.ts` | Credentials; `status: "earned"` only for things actually held |
| `lib/labs.ts`, `lib/fer.ts` | Lab sample data and logic |
| `messages/*.json` | All translated interface text |

## Known, accepted items

- `npm audit` (including dev dependencies) reports `braces` ≤ 3.0.3 via ESLint's glob tooling. No patched release exists yet; it is dev-only and never shipped. The CI gate audits production dependencies only, and Dependabot will raise the fix when it lands.
- `jsdom` is pinned to 26.x (DOMPurify's parser). jsdom 27+ requires an ESM-only package through `require()`, which crashes on Vercel's runtime; CI smoke-tests the build with require(ESM) disabled to catch any regression like this.
- MediaPipe tries to send usage telemetry to Google; the CSP blocks it, so you may see one console message. Nothing about the camera or photo leaves the device.

## Check before you share the link

- The FER paper summary in `lib/site.ts` is inferred from its title; replace it with the real abstract wording, and add co-authors to the in-progress entries.
- About shows "4 research lines in progress" (from your old About page) while Research lists two; add the others or change `site.researchInProgress`.
- The ResearchGate link is a search page; paste your exact profile URL into `site.researchgate`.
- If you earn Security+, CEH or a TryHackMe certificate, move it to `status: "earned"` in `lib/credentials.ts` with its verification link.
