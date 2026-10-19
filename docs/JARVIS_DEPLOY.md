# Deploy runbook for Jarvis

**Goal:** take `~/alvi-portfolio` from this Mac to a live, hardened site at
**https://alviador.is-a.dev** for $0/month, then prove it has no bugs.

**Who runs this:** Jarvis, operating the Mac (shell, browser, screen) on behalf of
Alvi. Follow the phases in order. Each step says what to do, how to check it
worked, and what to do if it didn't.

---

## Rules for Jarvis (read first)

1. **Stop and ask Alvi before** any of these. Say exactly what you are about to
   do and wait for a "yes":
   - signing up for, or logging in to, any account (GitHub, Vercel, Resend, Cloudflare, Upstash)
   - typing a password or a 2FA code (Alvi types these himself)
   - making a repository public, opening a pull request, or deploying to production
   - changing DNS or a domain setting
2. **Never show, speak, log or commit a secret.** API keys, tokens and
   `FORM_TOKEN_SECRET` go straight from the provider's page into the Vercel
   environment-variable form. Do not read them aloud, do not paste them into
   chat, and never put them in a file inside the repo.
3. **Never commit `.env.local`.** Before every commit, run
   `git status --short` and confirm no `.env` file is listed.
4. **If a check fails, stop the phase,** report the exact command and output to
   Alvi, and use the troubleshooting table at the end. Do not improvise fixes
   to code.
5. All commands run from `~/alvi-portfolio` unless stated otherwise.

---

## Phase 1: Preflight on this Mac

| # | Do | Expected |
|---|---|---|
| 1.1 | `cd ~/alvi-portfolio && node -v` | `v20.9` or newer |
| 1.2 | `npm ci` | finishes without errors |
| 1.3 | `npm run verify` | ends with `✓ Compiled successfully`; prints `i18n OK: 260 keys × 6 locales` |
| 1.4 | `npm audit --omit=dev` | `found 0 vulnerabilities` |
| 1.5 | `npm start` (leave running in a second terminal tab) | `Ready` on http://localhost:3000 |
| 1.6 | `node scripts/smoke-test.mjs http://localhost:3000` | last line `N/N passed`; exit code 0 |
| 1.7 | Stop the server (Ctrl-C in its tab) | |

If 1.3 or 1.6 fails: stop, report the failing line to Alvi.

---

## Phase 2: Put the code on GitHub

| # | Do | Expected |
|---|---|---|
| 2.1 | `gh auth status` | "Logged in to github.com as AlviAdor". If not: **ask Alvi**, then run `gh auth login` and let him complete it |
| 2.2 | `git init -b main` (skip if `.git` already exists) | |
| 2.3 | `git add -A && git status --short` | **No line containing `.env`**. `.env.example` is fine; `.env.local` must not appear. If it does, stop |
| 2.4 | `git commit -m "Initial portfolio: hardened, multilingual, 3D"` | commit created |
| 2.5 | **Ask Alvi:** "Create a public GitHub repo AlviAdor/alvi-portfolio and push?" | wait for yes |
| 2.6 | `gh repo create AlviAdor/alvi-portfolio --public --source . --push` | prints the repo URL |
| 2.7 | Open `https://github.com/AlviAdor/alvi-portfolio/actions` in the browser and wait for the **ci** workflow | all four jobs green: verify, dependency audit, secret scan, CodeQL |

If the **secret scan** job fails, something secret was committed. Stop and tell
Alvi immediately; the key must be rotated at its provider, not just deleted.

---

## Phase 3: Create the free accounts and collect the keys

Do these in the browser. For each one, **ask Alvi before signing up**. Keep the
values in the provider's tab until Phase 4 asks for them; never copy them
anywhere else.

### 3.1 Resend (email relay)
1. https://resend.com → sign up **with the inbox that should receive messages**.
2. API Keys → Create API Key → permission **Sending access**.
3. Note for Phase 4: `RESEND_API_KEY` (starts with `re_`), and that
   `CONTACT_TO_EMAIL` = the email Alvi signed up with.

### 3.2 Cloudflare Turnstile (bot check)
1. https://dash.cloudflare.com → sign up / log in → **Turnstile** → Add widget.
2. Widget name: `alvi-portfolio`. Hostnames: `alviador.is-a.dev`, plus the
   `*.vercel.app` hostname from Phase 4 (add it once known), plus `localhost`.
   Mode: **Managed**.
3. Note for Phase 4: the **Site Key** and the **Secret Key**.

### 3.3 Upstash Redis (rate limiting)
1. https://console.upstash.com → sign up → Create Database (Redis), type
   Regional, region close to Vercel's default (e.g. `us-east-1`), free plan.
2. Open the database → **REST API** section.
3. Note for Phase 4: `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.

### 3.4 Form-token secret (generated locally)
Run `openssl rand -hex 32`. The 64-character output is `FORM_TOKEN_SECRET`.
Generate it only when the Vercel form in Phase 4 is open, and paste it straight in.

---

## Phase 4: Deploy on Vercel

| # | Do | Expected |
|---|---|---|
| 4.1 | **Ask Alvi**, then sign in at https://vercel.com with GitHub | Vercel dashboard |
| 4.2 | Add New → Project → Import `AlviAdor/alvi-portfolio` | framework detected: **Next.js**; leave build settings as default |
| 4.3 | Before clicking Deploy, open **Environment Variables** and add each row below (Production and Preview) | |
| 4.4 | **Ask Alvi**, then click **Deploy** | build log ends "Ready"; a URL like `alvi-portfolio-xxxx.vercel.app` |

| Name | Value |
|---|---|
| `RESEND_API_KEY` | from 3.1 |
| `CONTACT_TO_EMAIL` | Alvi's Resend sign-up email |
| `CONTACT_FROM_EMAIL` | `Portfolio Contact <onboarding@resend.dev>` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Site Key from 3.2 |
| `TURNSTILE_SECRET_KEY` | Secret Key from 3.2 |
| `UPSTASH_REDIS_REST_URL` | from 3.3 |
| `UPSTASH_REDIS_REST_TOKEN` | from 3.3 |
| `FORM_TOKEN_SECRET` | from 3.4 |
| `NEXT_PUBLIC_SITE_URL` | `https://alviador.is-a.dev` |
| `GITHUB_TOKEN` | optional; a fine-grained token, "Public repositories (read-only)" |

Then:

| # | Do | Expected |
|---|---|---|
| 4.5 | Add the `*.vercel.app` hostname to the Turnstile widget (3.2) | saved |
| 4.6 | `node scripts/smoke-test.mjs https://<the-vercel-url>` | all PASS. The "all protections switched on" check passes only once every key above is set |

`NEXT_PUBLIC_*` values are baked in at build time: after changing any of them,
redeploy (Deployments → ⋯ → Redeploy).

---

## Phase 5: Register the free domain `alviador.is-a.dev`

is-a.dev gives free subdomains to developers through a pull request. As of
18 Oct 2026, `alviador` is unclaimed. Re-check in 5.1 because names are
first-come.

| # | Do | Expected |
|---|---|---|
| 5.1 | `curl -s -o /dev/null -w "%{http_code}" https://raw.githubusercontent.com/is-a-dev/register/main/domains/alviador.json` | `404` = still free. Anything else: stop and ask Alvi for another name |
| 5.2 | Vercel → Project → Settings → **Domains** → Add `alviador.is-a.dev`. If offered a `www` redirect, turn it off | Vercel shows "Invalid configuration" plus the **record it wants** (currently an **A record `216.198.79.1`**, or a CNAME) and a **TXT verification value** for `_vercel` |
| 5.3 | `gh repo fork is-a-dev/register --clone=false` | fork created under AlviAdor |
| 5.4 | In the fork (browser: Add file → Create new file), create `domains/alviador.json` with the content below, using the record Vercel showed | committed to a new branch |
| 5.5 | Create `domains/_vercel.alviador.json` (content below) with Vercel's TXT value | committed to the same branch |
| 5.6 | **Ask Alvi**, then open a pull request to `is-a-dev/register`. Fill in the template: describe the site and link the live `*.vercel.app` URL (reviewers check that the site is real and finished) | PR open; it may take hours to a few days |
| 5.7 | When the PR is merged: `dig +short alviador.is-a.dev` | the record from 5.2 |
| 5.8 | Back in Vercel → Domains | `alviador.is-a.dev` shows **Valid Configuration**; HTTPS certificate issued automatically |

`domains/alviador.json` (use **either** the A record **or** the CNAME, whichever Vercel showed in 5.2):

```json
{
  "owner": { "username": "AlviAdor", "email": "sarker.faizal2537@gmail.com" },
  "records": { "A": ["216.198.79.1"] }
}
```

```json
{
  "owner": { "username": "AlviAdor", "email": "sarker.faizal2537@gmail.com" },
  "records": { "CNAME": "<the value Vercel showed, e.g. cname.vercel-dns.com>" }
}
```

`domains/_vercel.alviador.json`:

```json
{
  "owner": { "username": "AlviAdor", "email": "sarker.faizal2537@gmail.com" },
  "records": { "TXT": "<the vc-domain-verify=... value Vercel showed>" }
}
```

Do not use js.org instead: its rules exclude personal portfolios.

---

## Phase 6: Bug check on the live site

### 6.1 Automated (must be all green)

```bash
node scripts/smoke-test.mjs https://alviador.is-a.dev --rate-limit
```

Expected: every line `✓ PASS`, exit code 0. `--rate-limit` deliberately sends
up to 25 requests to prove a 429 comes back; run it once, not in a loop.

### 6.2 In the browser (desktop, then a phone or a 390 px-wide window)

Open https://alviador.is-a.dev and confirm each item. Note any that fail.

- [ ] Greeting intro plays once, then the hero animates in; the particle field moves with the mouse and reacts to a click.
- [ ] Hero **Neural / Defense** toggle recolours the particles; the "Live security posture" panel shows **live**, with every row "on" and Rate limit "Upstash".
- [ ] About: hovering the portrait shows the face scan and turns the backdrop dark (status reads "BG MASK · LOCKED").
- [ ] Roadmap: hovering a node fills the side panel; the Cisco node links out.
- [ ] Labs → Packet filter: adding an "allow in TCP 22" rule turns the SSH row red and the result shows "over-exposed".
- [ ] Labs → Model confidence: the slider moves the decision between "Happy" and "Abstains". Camera mode asks for permission and stops cleanly.
- [ ] Labs → This site's headers → Run audit: grade **A+**, every header "present".
- [ ] Language switcher (globe icon): each of EN · ES · FR · DE · 日本語 · বাংলা changes the interface, and the URL gains `/es`, `/fr`, …
- [ ] Terminal (`` ` `` key): `help`, `security-audit`, `certs`, `langs bn` all respond.
- [ ] Contact: **ask Alvi**, then send one real test message. The bot check passes, the form shows "Received", and the email arrives in Alvi's inbox within a minute.
- [ ] Phone width: nothing scrolls sideways; the hero falls back cleanly if the phone is low-power.

### 6.3 Repository health
- [ ] GitHub → Actions: latest **ci** run all green.
- [ ] GitHub → Security → Code scanning: no open alerts.
- [ ] GitHub → Settings → Code security: Dependabot alerts and security updates **on**.

---

## Phase 7: Report back to Alvi

Tell Alvi, briefly:

1. The live URL, and whether `alviador.is-a.dev` is active or the PR is still waiting.
2. The smoke-test result line (e.g. `27/27 passed`).
3. Any unchecked item from 6.2, with what you saw.
4. Anything skipped and why.

Never include keys or tokens in the report.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Smoke test: "nonce repeated across requests" | Pages served statically | Confirm `export const dynamic = "force-dynamic"` is still in `app/[locale]/layout.tsx`; redeploy |
| "production: all protections switched on" fails | A Phase 4 variable is missing or wrong | Compare the names against the table exactly; redeploy after editing |
| Contact shows "The bot check didn't pass" | Hostname not on the Turnstile widget | Add the current hostname in Cloudflare Turnstile (3.2) |
| Contact shows "The mail relay isn't configured yet" | `RESEND_API_KEY` missing, or still the `re_xxxx` placeholder | Set the real key; redeploy |
| Email not delivered, no error shown | `CONTACT_TO_EMAIL` isn't the Resend account's email | Without a verified domain, Resend only delivers to the account owner |
| `/api/github` returns 502 | GitHub rate limit (60/hour without a token) | Add `GITHUB_TOKEN`; it recovers within the hour regardless |
| Vercel domain stuck on "Invalid configuration" | is-a.dev PR not merged yet, or wrong record | Wait for the merge; re-check 5.2 vs the JSON you submitted |
| Console shows a blocked request to `odml.pa.googleapis.com` | MediaPipe telemetry, blocked by the CSP on purpose | Nothing; this is expected |
| CI "dependency audit" informational step fails | Dev-only `braces` advisory (no patched release yet) | Expected; the production gate above it must still pass |
| CI `npm ci` fails: "Missing: <pkg> from lock file" | The lockfile was written by a different npm major than CI's npm 10 (this Mac has npm 12) | Never hand-edit `package-lock.json`. Run `npm install`, then `npm run check:lock` (replays CI's npm 10 `ci` check locally); commit both `package.json` and `package-lock.json` only when it passes |
