import json
import sys
import wave

import numpy as np
from pocketsphinx import Decoder

LEAD_MS = 200
TAIL_MS = 400
# The bundled dictionary lacks these, so each gets a pronunciation or is split into words it knows.
PRONOUNCE = {"diffs": "D IH F S"}
SPLIT = {"standup": ["stand", "up"]}

manifest = json.load(open(sys.argv[1]))
decoder = Decoder(samprate=16000, loglevel="FATAL")
for word, phones in PRONOUNCE.items():
    decoder.add_word(word, phones, update=True)
# The 48 kHz clip is low-passed below the 16 kHz Nyquist, then every third sample is kept.
lowpass = np.sinc(0.9 * (np.arange(-31, 32) / 3)) * np.kaiser(63, 8.0)
lowpass /= lowpass.sum()


def read_16k(path):
    with wave.open(path) as w:
        raw = np.frombuffer(w.readframes(w.getnframes()), dtype=np.uint8).reshape(-1, w.getnchannels(), w.getsampwidth())
    padded = np.concatenate([raw[:, 0, :], np.where(raw[:, 0, 2:3] >= 128, 255, 0).astype(np.uint8)], axis=1)
    samples = padded.copy().view("<i4").reshape(-1).astype(np.float64) / 2**23
    quiet = lambda ms: np.zeros(ms * 48)
    samples = np.concatenate([quiet(LEAD_MS), samples, quiet(TAIL_MS)])
    return (np.clip(np.convolve(samples, lowpass, mode="same")[::3], -1, 1) * 32767).astype("<i2").tobytes()


out = {}
for take in manifest:
    parts = [SPLIT.get(w, [w]) for w in take["words"]]
    flat = [p for ps in parts for p in ps]
    missing = [w for w in flat if decoder.lookup_word(w) is None]
    if missing:
        sys.exit(f'{take["id"]}: no pronunciation for {missing}, add it to PRONOUNCE or SPLIT in sphinx_words.py')
    decoder.set_align_text(" ".join(flat))
    decoder.start_utt()
    decoder.process_raw(read_16k(take["file"]), full_utt=True)
    decoder.end_utt()
    heard = [s for s in decoder.seg() if not s.word.startswith(("<", "[", "+"))]
    if len(heard) != len(flat):
        sys.exit(f'{take["id"]}: aligned {len(heard)} of {len(flat)} words')
    words, k = [], 0
    for word, ps in zip(take["words"], parts):
        first, last = heard[k], heard[k + len(ps) - 1]
        k += len(ps)
        words.append({"word": word, "start": (first.start_frame * 10 - LEAD_MS) / 1000, "end": ((last.end_frame + 1) * 10 - LEAD_MS) / 1000})
    out[take["id"]] = words
    print(f'{take["id"]}: aligned {len(flat)} words', file=sys.stderr)

json.dump(out, open(sys.argv[2], "w"))
