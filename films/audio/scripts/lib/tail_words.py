import json
import re
import sys
import wave

import numpy as np
from faster_whisper import WhisperModel

STEP_MS = 20

manifest = json.load(open(sys.argv[1]))
model = WhisperModel("small", device="cpu", compute_type="int8")
# The 48 kHz clip is low-passed below the 16 kHz Nyquist, then every third sample is kept.
lowpass = np.sinc(0.9 * (np.arange(-31, 32) / 3)) * np.kaiser(63, 8.0)
lowpass /= lowpass.sum()


def read_16k(path):
    with wave.open(path) as w:
        raw = np.frombuffer(w.readframes(w.getnframes()), dtype=np.uint8).reshape(-1, w.getnchannels(), w.getsampwidth())[:, 0, :]
    samples = np.concatenate([raw, np.where(raw[:, 2:3] >= 128, 255, 0).astype(np.uint8)], axis=1).copy().view("<i4").reshape(-1) / 2**23
    return np.convolve(samples, lowpass, mode="same")[::3].astype(np.float32)


def first_word(text):
    for token in text.split():
        word = re.sub(r"[^a-z0-9]", "", token.lower())
        if word:
            return "fifty" if word == "50" else word
    return ""


out = {}
for take in manifest:
    audio = read_16k(take["file"])
    out[take["id"]] = []
    for probe in take["probes"]:
        cuts = []
        for at in range(probe["from"], probe["to"] + 1, STEP_MS):
            segments, _ = model.transcribe(audio[at * 16 :], language="en", temperature=0, beam_size=5, condition_on_previous_text=False, vad_filter=False)
            cuts.append({"at": at, "first": first_word(" ".join(s.text for s in segments))})
        out[take["id"]].append({"index": probe["index"], "cuts": cuts})
    print(f'{take["id"]}: cut {len(take["probes"])} words', file=sys.stderr)

json.dump(out, open(sys.argv[2], "w"))
