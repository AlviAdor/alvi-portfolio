# Re-render the walkthrough and screenshots

Run these after the site changes, or once production keys are live, so the live
panel shows Upstash and the mail relay "on". Everything is local and free;
working files go to git-ignored `.media-work/` and `.media-tools/`.

## One-time tool setup (≈ 400 MB, macOS arm64)

```bash
mkdir -p .media-tools/{voices,bin,fonts}
python3 -m venv .media-tools/venv && .media-tools/venv/bin/pip install -q piper-tts fonttools
# neural narration voice (MIT-licensed Piper voice "Ryan")
for f in en_US-ryan-high.onnx en_US-ryan-high.onnx.json; do
  curl -sL -o .media-tools/voices/$f "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/ryan/high/$f"; done
# static ffmpeg 6.0 with libx264 + libass (no system install)
curl -sL https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1/ffmpeg-darwin-arm64.gz | gunzip > .media-tools/bin/ffmpeg && chmod +x .media-tools/bin/ffmpeg
# brand fonts for captions and the end card (OFL)
curl -sL -o /tmp/SG.ttf "https://github.com/google/fonts/raw/main/ofl/spacegrotesk/SpaceGrotesk%5Bwght%5D.ttf"
curl -sL -o /tmp/JB.ttf "https://github.com/google/fonts/raw/main/ofl/jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf"
I=.media-tools/venv/bin/fonttools
$I varLib.instancer /tmp/SG.ttf wght=500 -o .media-tools/fonts/SpaceGrotesk-Medium.ttf --update-name-table -q
$I varLib.instancer /tmp/SG.ttf wght=700 -o .media-tools/fonts/SpaceGrotesk-Bold.ttf --update-name-table -q
$I varLib.instancer /tmp/JB.ttf wght=500 -o .media-tools/fonts/JetBrainsMono-Medium.ttf --update-name-table -q
# browser automation (uses your installed Google Chrome)
npm i --no-save playwright-core@1
```

## Render

```bash
npm run build && npm start                       # serve the site on :3000 (another tab)
.media-tools/venv/bin/python scripts/media/voice.py      # 1. narration, one WAV per line
node scripts/media/record.mjs                            # 2. 1080p screencast, scenes timed to the narration
python3 scripts/media/assemble.py                        # 3. edit, captions, end card → media/walkthrough/
node scripts/media/screenshots.mjs                       # 4. README screenshots → docs/screenshots/
```

To change what's said, edit `scripts/media/script.json`: `say` is what the voice
speaks (spell acronyms phonetically, e.g. "A-I-U-B"); `cap` is the caption text.
Scene actions live in `record.mjs`; each scene holds exactly as long as its line.
Then update the chapter times in `media/walkthrough/PUBLISHING.md`.
