import json
import re
import sys
from difflib import SequenceMatcher

from faster_whisper import WhisperModel

manifest = json.load(open(sys.argv[1]))
model = WhisperModel("small", device="cpu", compute_type="int8")


def letters(text):
    return re.sub(r"[^a-z0-9]", "", text.lower().replace("50", "fifty"))


def hear(file, prompt):
    segments, _ = model.transcribe(
        file,
        language="en",
        word_timestamps=True,
        temperature=0,
        beam_size=5,
        condition_on_previous_text=False,
        initial_prompt=prompt,
        vad_filter=False,
    )
    return [
        {"word": w.word, "start": float(w.start), "end": float(w.end), "probability": float(w.probability)}
        for segment in segments
        for w in segment.words
    ]


out = {}
for take in manifest:
    want = letters(take["spoken"])
    # A prompt of the expected words sometimes makes the model hallucinate a sign-off, so it only runs when the plain read misses.
    best, best_score = None, -1.0
    for prompt in (None, take["spoken"]):
        words = hear(take["file"], prompt)
        score = SequenceMatcher(None, want, letters("".join(w["word"] for w in words))).ratio()
        if score > best_score:
            best, best_score = words, score
        if score >= 0.97:
            break
    out[take["id"]] = best
    print(f'{take["id"]}: heard {best_score:.2f} of the spoken form', file=sys.stderr)

json.dump(out, open(sys.argv[2], "w"))
