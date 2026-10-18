"""Post-production: frames → 1080p30 master, narration bed, captions, end card, exports."""
import json, os, re, subprocess, sys, wave

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
ROOT = os.environ.get("MEDIA_WORK", os.path.join(REPO, ".media-work"))     # frames, timeline, narration
TOOLS = os.environ.get("MEDIA_TOOLS", os.path.join(REPO, ".media-tools"))  # ffmpeg, fonts, voice
FF = os.path.join(TOOLS, "bin", "ffmpeg")
FONTS = os.path.join(TOOLS, "fonts")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(REPO, "media", "walkthrough")
os.makedirs(OUT, exist_ok=True)
W, H, FPS = 1920, 1080, 30
END_CARD = 5.0
XFADE = 0.8

def ff(*args):
    r = subprocess.run([FF, "-hide_banner", "-loglevel", "error", "-y", *args], capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stderr[-2500:]); sys.exit(1)

script = {l["id"]: l for l in json.load(open(os.path.join(HERE, "script.json")))}
durs = json.load(open(os.path.join(ROOT, "durations.json")))
tl = json.load(open(os.path.join(ROOT, "timeline.json")))
frames = tl["frames"]
t0 = tl["scenes"][0]["start"]
first = next(i for i, f in enumerate(frames) if f["ts"] >= t0 - 0.05)
frames = frames[first:]
vt0 = frames[0]["ts"]
end = tl["end"]
main_dur = end - vt0
offsets = {s["id"]: max(0.0, s["start"] - vt0) for s in tl["scenes"]}

# ── 1. picture: variable-rate screencast → constant 30 fps ────────────────
lst = os.path.join(ROOT, "frames.txt")
with open(lst, "w") as f:
    for i, fr in enumerate(frames):
        nxt = frames[i + 1]["ts"] if i + 1 < len(frames) else end
        f.write(f"file '{fr['file']}'\nduration {max(0.001, nxt - fr['ts']):.4f}\n")
    f.write(f"file '{frames[-1]['file']}'\n")
main = os.path.join(ROOT, "main.mp4")
ff("-f", "concat", "-safe", "0", "-i", lst, "-vf", f"fps={FPS},scale={W}:{H}:flags=lanczos:out_color_matrix=bt709:out_range=tv,format=yuv420p",
   "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-tune", "film", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", main)

# ── 2. end card ───────────────────────────────────────────────────────────
sg_b = os.path.join(FONTS, "SpaceGrotesk-Bold.ttf")
sg_m = os.path.join(FONTS, "SpaceGrotesk-Medium.ttf")
jb = os.path.join(FONTS, "JetBrainsMono-Medium.ttf")
def dt(text, font, size, color, y, alpha_in=0.0):
    t = text.replace(":", r"\:").replace("'", r"’")
    return (f"drawtext=fontfile='{font}':text='{t}':fontsize={size}:fontcolor={color}:x=(w-text_w)/2:y={y}:"
            f"alpha='if(lt(t,{alpha_in}),0,if(lt(t,{alpha_in}+0.6),(t-{alpha_in})/0.6,1))'")
card = os.path.join(ROOT, "endcard.mp4")
vf = ",".join([
    "format=yuv420p",
    "vignette=PI/5",
    dt("ALVI ADOR", jb, 30, "0x00F0FF", 330, 0.2),
    dt("Cybersecurity × AI", sg_b, 112, "0xE6EDF7", 390, 0.35),
    dt("Built to be checked, not just claimed.", sg_m, 46, "0x8A94A8", 545, 0.6),
    "drawbox=x=(iw-360)/2:y=640:w=360:h=2:color=0x00F0FF@0.8:t=fill:enable='gte(t,0.8)'",
    dt("github.com/AlviAdor   ·   linkedin.com/in/alviador", jb, 32, "0xE6EDF7", 690, 0.9),
    dt("Open to internships & research collaborations", jb, 26, "0x4ADE80", 750, 1.1),
])
ff("-f", "lavfi", "-i", f"color=c=0x0B0F17:s={W}x{H}:r={FPS}:d={END_CARD}", "-vf", vf,
   "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", card)

# ── 3. join with a cross-fade ─────────────────────────────────────────────
total = main_dur + END_CARD - XFADE
picture = os.path.join(ROOT, "picture.mp4")
ff("-i", main, "-i", card, "-filter_complex",
   f"[0:v]settb=AVTB,fps={FPS}[a];[1:v]settb=AVTB,fps={FPS}[b];[a][b]xfade=transition=fade:duration={XFADE}:offset={main_dur - XFADE:.3f},format=yuv420p[v]",
   "-map", "[v]", "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-movflags", "+faststart", picture)

# ── 4. narration bed: each line at its scene offset ───────────────────────
ids = [s["id"] for s in tl["scenes"]]
inputs, chains = [], []
for i, sid in enumerate(ids):
    inputs += ["-i", os.path.join(ROOT, "vo", f"{sid}.wav")]
    ms = int(offsets[sid] * 1000) + 120  # land just after the cut
    chains.append(f"[{i}:a]aresample=48000,adelay={ms}|{ms}[a{i}]")
mix = "".join(f"[a{i}]" for i in range(len(ids)))
fc = ";".join(chains) + f";{mix}amix=inputs={len(ids)}:normalize=0:dropout_transition=0,pan=stereo|c0=c0|c1=c0," \
     f"highpass=f=80,acompressor=threshold=-20dB:ratio=2.5:attack=8:release=120,loudnorm=I=-16:TP=-1.5:LRA=9," \
     f"apad,atrim=0:{total:.3f},afade=t=out:st={total - 1.2:.3f}:d=1.2[out]"
audio = os.path.join(ROOT, "narration.m4a")
ff(*inputs, "-filter_complex", fc, "-map", "[out]", "-ar", "48000", "-c:a", "aac", "-b:a", "192k", audio)

# ── 5. captions (broadcast conventions) ───────────────────────────────────
# ≤2 lines × 42 chars, breaks at phrase boundaries, ≥1.2 s on screen, and reading
# speed kept ≤20 CPS by letting a cue borrow the silence before the next scene.
MAX_LINE, MAX_CAP, MIN_DUR, MAX_CPS = 42, 80, 1.2, 20.0
JOINERS = {"and", "or", "but", "so", "with", "from", "to", "that", "which", "who", "into", "for", "of", "in", "on", "by"}
def fits(s):
    if len(s) <= MAX_LINE: return True
    if len(s) > MAX_CAP: return False
    return any(len(s[:m.start()]) <= MAX_LINE and len(s[m.start() + 1:]) <= MAX_LINE for m in re.finditer(" ", s))
def split_long(phrase):
    words, out, cur = phrase.split(), [], ""
    for w in words:
        cand = (cur + " " + w).strip()
        if cur and not fits(cand): out.append(cur); cur = w
        else: cur = cand
    if cur: out.append(cur)
    return out
def units(text):
    phrases = [p for p in re.split(r"(?<=[,.:;!?—])\s+", text) if p]
    caps, cur = [], ""
    for ph in phrases:
        for piece in (split_long(ph) if not fits(ph) else [ph]):
            cand = (cur + " " + piece).strip()
            sentence_end = bool(re.search(r"[.!?]$", cur))
            if cur and (not fits(cand) or (sentence_end and len(cand) > MAX_LINE)): caps.append(cur); cur = piece
            else: cur = cand
    if cur: caps.append(cur)
    return caps
def two_lines(s):
    if len(s) <= MAX_LINE: return s
    best, best_score = None, 1e9
    for m in re.finditer(" ", s):
        a, b = s[:m.start()], s[m.start() + 1:]
        score = abs(len(a) - len(b)) * 0.6
        if len(a) > MAX_LINE or len(b) > MAX_LINE: score += 1000
        if a[-1] in ",.:;!?—": score -= 9
        if b.split()[0].lower() in JOINERS: score -= 4
        if score < best_score: best, best_score = m.start(), score
    return s[:best] + "\n" + s[best + 1:]
cues = []
for k, sid in enumerate(ids):
    start, dur = offsets[sid] + 0.12, durs[sid] - 0.2
    window_end = (offsets[ids[k + 1]] + 0.02) if k + 1 < len(ids) else total - 0.3
    parts = units(script[sid]["cap"])
    # merge pieces that would flash by too quickly
    merged = []
    for p in parts:
        if merged and dur * len(p) / max(1, len(script[sid]["cap"])) < MIN_DUR and fits(merged[-1] + " " + p):
            merged[-1] += " " + p
        else:
            merged.append(p)
    chars = sum(len(p) for p in merged)
    t, line_cues = start, []
    for p in merged:
        d = max(MIN_DUR, dur * len(p) / chars)
        line_cues.append([t, t + d, p]); t += d
    # stretch into the trailing silence if any cue reads too fast, never past the next scene
    slack = max(0.0, window_end - 0.06 - line_cues[-1][1])
    worst = max(len(c[2]) / (c[1] - c[0]) for c in line_cues)
    if worst > 17.0 and slack > 0:
        grow = min(slack, sum(c[1] - c[0] for c in line_cues) * (worst / 17.0 - 1))
        scale = (sum(c[1] - c[0] for c in line_cues) + grow) / sum(c[1] - c[0] for c in line_cues)
        t = line_cues[0][0]
        for c in line_cues:
            d = (c[1] - c[0]) * scale; c[0], c[1] = t, t + d; t += d
    if line_cues[-1][1] > window_end - 0.06:  # min-duration padding overran: compress to fit
        span = line_cues[-1][1] - line_cues[0][0]
        room = window_end - 0.06 - line_cues[0][0]
        k2 = room / span; t = line_cues[0][0]
        for c in line_cues:
            d = (c[1] - c[0]) * k2; c[0], c[1] = t, t + d; t += d
    for a, b, p in line_cues:
        cues.append([a, b - 0.04, two_lines(p)])
for i in range(1, len(cues)):
    if cues[i][0] < cues[i - 1][1] + 0.04:
        cues[i - 1][1] = cues[i][0] - 0.04
cues = [tuple(c) for c in cues]
def stamp(sec, sep):
    h, r = divmod(sec, 3600); m, s = divmod(r, 60)
    return f"{int(h):02d}:{int(m):02d}:{int(s):02d}{sep}{int(round((s % 1) * 1000)) % 1000:03d}"
base = os.path.join(OUT, "alvi-ador-walkthrough.en")
with open(base + ".srt", "w") as f:
    for i, (a, b, s) in enumerate(cues, 1):
        f.write(f"{i}\n{stamp(a, ',')} --> {stamp(b, ',')}\n{s}\n\n")
with open(base + ".vtt", "w") as f:
    f.write("WEBVTT\nKind: captions\nLanguage: en\n\n")
    for a, b, s in cues:
        f.write(f"{stamp(a, '.')} --> {stamp(b, '.')} line:88%\n{s}\n\n")
ass = os.path.join(ROOT, "captions.ass")
with open(ass, "w") as f:
    f.write(f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Space Grotesk Medium,46,&H00F7EDE6,&H00F7EDE6,&H50170F0B,&H50170F0B,0,0,0,0,100,100,0,0,3,16,0,2,160,160,74,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
""")
    for a, b, s in cues:
        f.write(f"Dialogue: 0,{stamp(a, '.')[:-1]},{stamp(b, '.')[:-1]},Cap,,0,0,0,,{s.replace(chr(10), r'\N')}\n")

# ── 6. exports ────────────────────────────────────────────────────────────
social = os.path.join(OUT, "alvi-ador-walkthrough.mp4")
ff("-i", picture, "-i", audio, "-vf", f"ass={ass}:fontsdir={FONTS}", "-map", "0:v", "-map", "1:a",
   "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-c:a", "copy",
   "-movflags", "+faststart", "-metadata", "title=Alvi Ador: Cybersecurity × AI portfolio walkthrough", social)
clean = os.path.join(OUT, "alvi-ador-walkthrough-clean.mp4")
ff("-i", picture, "-i", audio, "-i", base + ".srt", "-map", "0:v", "-map", "1:a", "-map", "2:s",
   "-c:v", "copy", "-c:a", "copy", "-c:s", "mov_text", "-metadata:s:s:0", "language=eng", "-metadata:s:s:0", "title=English",
   "-disposition:s:0", "0", "-movflags", "+faststart",
   "-metadata", "title=Alvi Ador: Cybersecurity × AI portfolio walkthrough", clean)

# ── 7. thumbnail (hero moment) ────────────────────────────────────────────
thumb_t = offsets["intro"] + durs["intro"] * 0.75
ff("-ss", f"{thumb_t:.2f}", "-i", main, "-frames:v", "1", "-vf",
   ",".join([f"scale=1280:720:flags=lanczos",
             "drawbox=x=40:y=640:w=330:h=50:color=0x0B0F17@0.85:t=fill",
             "drawbox=x=40:y=640:w=4:h=50:color=0x00F0FF:t=fill",
             f"drawtext=fontfile='{jb}':text='▶  2-MIN WALKTHROUGH':fontsize=22:fontcolor=0x00F0FF:x=60:y=654"]),
   "-q:v", "2", os.path.join(OUT, "thumbnail.jpg"))

json.dump({"chapters": [{"id": s, "t": round(offsets[s], 2)} for s in ids], "total": round(total, 2), "cues": len(cues)},
          open(os.path.join(ROOT, "assembly.json"), "w"), indent=1)
print(f"done · {total:.1f}s · {len(cues)} captions")
