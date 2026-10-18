"""Render one narration WAV per line of script.json with Piper and record exact durations."""
import json, os, subprocess, sys, wave

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
WORK = os.environ.get("MEDIA_WORK", os.path.join(REPO, ".media-work"))
TOOLS = os.environ.get("MEDIA_TOOLS", os.path.join(REPO, ".media-tools"))
MODEL = os.path.join(TOOLS, "voices", "en_US-ryan-high.onnx")
PY = os.path.join(TOOLS, "venv", "bin", "python")

os.makedirs(os.path.join(WORK, "vo"), exist_ok=True)
durations = {}
for line in json.load(open(os.path.join(HERE, "script.json"))):
    out = os.path.join(WORK, "vo", f"{line['id']}.wav")
    r = subprocess.run([PY, "-m", "piper", "-m", MODEL, "-f", out, "--length-scale", "0.94", "--sentence-silence", "0.28"],
                       input=line["say"].encode(), capture_output=True)
    if r.returncode:
        sys.exit(f"piper failed on {line['id']}: {r.stderr.decode()[-300:]}")
    with wave.open(out) as w:
        durations[line["id"]] = round(w.getnframes() / w.getframerate(), 3)
json.dump(durations, open(os.path.join(WORK, "durations.json"), "w"), indent=1)
print(f"{len(durations)} lines · {sum(durations.values()):.1f}s of narration")
