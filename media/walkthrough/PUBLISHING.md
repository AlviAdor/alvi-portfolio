# Walkthrough: publishing kit

**Files in this folder**

| File | Use it for |
|---|---|
| `alvi-ador-walkthrough.mp4` | LinkedIn, X, Instagram, anywhere video autoplays muted. Captions are burned in. |
| `alvi-ador-walkthrough-clean.mp4` | YouTube, your portfolio, a recruiter email. No burned captions; includes a toggleable English subtitle track. |
| `alvi-ador-walkthrough.en.srt` | Upload as the caption file on YouTube / LinkedIn (better than auto-captions). |
| `alvi-ador-walkthrough.en.vtt` | Captions for an HTML `<video>` element. |
| `thumbnail.jpg` | 1280×720 cover / custom thumbnail. |

**Specs:** 1920×1080, 30 fps, H.264 High, BT.709, AAC 48 kHz stereo, −16 LUFS integrated (the web/social loudness target), 2:12. Captions: 38 cues, at most 2 lines × 42 characters, at most 18.7 characters per second.

---

## YouTube

**Title** (pick one)
- I built a portfolio you can actually audit: cybersecurity × AI walkthrough
- Cybersecurity student portfolio: live security labs, 3D WebGL, 6 languages
- A portfolio that proves its security claims (Next.js, WebGL, zero-trust)

**Description**

> Most portfolios tell you someone understands security. This one lets you check.
>
> A two-minute tour of my portfolio: a hardened Next.js site where every security claim can be verified live, with hands-on labs, published AI research and a 3D interface that works in six languages.
>
> What's inside:
> • A live security-posture panel, read from the server
> • Hands-on labs: a firewall policy sandbox, a model-confidence explorer from my facial-emotion-recognition research, and a live audit of the site's own headers
> • An academic & merit roadmap (AIUB, Cybersecurity major, ML minor)
> • Research synced from ResearchGate DOIs, with citations
> • Per-request CSP nonces, rate limiting, Turnstile, signed single-use form tokens
> • English, Español, Français, Deutsch, 日本語, বাংলা
>
> I'm a final-year CSE student at AIUB, open to ML/AI and security internships and research collaborations.
>
> GitHub: https://github.com/AlviAdor
> LinkedIn: https://www.linkedin.com/in/alviador
>
> Chapters
> 0:00 Intro
> 0:11 Live security posture, scene modes & portrait scan
> 0:30 Academic & merit roadmap
> 0:46 Lab: firewall policy sandbox
> 0:58 Lab: model confidence & live header audit
> 1:12 Research sync & case studies
> 1:28 Credentials & six languages
> 1:40 Terminal & hardened contact form
> 1:58 Outro

**Tags:** cybersecurity, devsecops, web security, content security policy, next.js, webgl, three.js, computer vision, facial emotion recognition, portfolio, AIUB, student portfolio

Every chapter runs at least 10 s, as YouTube requires.

**Upload settings:** add `alvi-ador-walkthrough.en.srt` under Subtitles → Upload file → *With timing*. Set the custom thumbnail to `thumbnail.jpg`. Category: Science & Technology.

---

## LinkedIn

Upload `alvi-ador-walkthrough.mp4` (captions burned in, since LinkedIn autoplays muted). Also attach the `.srt` under *Edit → Captions*.

**Post**

> Most portfolios *tell* you someone understands security. I wanted mine to let you *check*.
>
> So I rebuilt it as a hardened, interactive site:
> 🔐 Per-request CSP nonces, rate limiting, bot checks and signed single-use form tokens, plus a lab that audits the site's own headers live
> 🧪 Hands-on labs: write firewall rules, or drag a confidence threshold from my facial-emotion-recognition research and watch the model abstain
> 🧭 A merit roadmap from school to a Cybersecurity major at AIUB, a Cisco Ethical Hacker certificate and published AI research (goals are labelled as goals)
> 🌐 Six languages, including Bengali, my first language
>
> 2-minute walkthrough below. I'm open to ML/AI and security internships and research collaborations. If that overlaps with your team, I'd love to talk.
>
> #cybersecurity #devsecops #computervision #machinelearning #webdevelopment #nextjs #internship

---

## Short cuts (optional)

For Reels / Shorts / TikTok, cut vertical clips from these self-contained beats in the clean master. They have no captions burned in, so add your own in-app:

| Beat | In → out | Hook line |
|---|---|---|
| Firewall lab | 0:46 → 0:58 | "Open SSH to the internet and watch what happens." |
| Header audit | 1:06 → 1:12 | "This page grades its own security headers. Live." |
| Six languages | 1:34 → 1:40 | "Same portfolio, six languages, including Bengali." |

---

## Notes

- **Voice:** synthetic narration (Piper neural TTS, "Ryan" voice) generated on this Mac. If you'd rather it be your own voice, record the 15 lines in `scripts/media/script.json` as WAVs named by `id` into `.media-work/vo/`, update `durations.json`, and re-run `record.mjs` + `assemble.py`; every scene re-times itself to your delivery.
- **What's shown:** the walkthrough was recorded on a local build, so the live panel honestly reads "Rate limit: in-memory" and "Mail relay: off". Once the site is deployed with Upstash and Resend (see `docs/JARVIS_DEPLOY.md`), re-render with [`scripts/media/REPRODUCE.md`](../../scripts/media/REPRODUCE.md) if you want those rows to show the production values.
- **Personal data:** the contact form shows placeholder details ("Ada Lovelace"); no real message is sent in the video.
