# Film sound

One bed, one set of synthesized interface sounds and, for Sage, two voices per film. Cue times live in `scripts/films.ts` and come out as `<film>/cues.json`.

```
pnpm tsx films/audio/scripts/generate-music.ts <sidecar|sage|shell> [--take N] [--force]
pnpm tsx films/audio/scripts/generate-voice.ts sage [--only cue-id] [--force]
pnpm tsx films/audio/scripts/build.ts <film> [--take N] [--bed synth|lyria] [--dry]
pnpm tsx films/audio/scripts/verify.ts [film] [--rebuild]
pnpm tsx films/audio/scripts/edges.ts
```

- `generate-*` pay OpenRouter once and write `<film>/sources/`, which is committed so a rebuild never pays again. Each call is appended to the team's `spend.log`.
- `build` reads only `sources/` and `films.ts`, so it runs offline and is bit-identical. It writes `mix.wav` (48 kHz stereo, 24-bit, -16 LUFS integrated, true peak at or under -1.5 dBTP), `stems/*.flac` and `cues.json`. Cue and voice levels are fixed, the bed gain is what lands the loudness.
- `music.source` in `films.ts` picks the bed. It is `synth`, a 108 bpm groove in D (kick, hats, bass, plucks, clap, stabs) from `scripts/lib/groove.ts`, with each film's downbeat, closing bar and the bar where each layer enters in `scripts/lib/bed.ts`, while Lyria answers 429 on OpenRouter. After `generate-music` lands a take, set it to `lyria` and `--bed` overrides it for one run.
- The bed's closing hit (kick, bass root and the D chord ringing out) lands just before each end card's line draw. `cues.json` carries `bed` with the tempo, the closing time and every section start, and `verify` checks the hit against the `line-end-card` cue.
- Every cue is derived in `films.ts` from two files per film: play's `SAGE_SCRIPT`, `SHELL_SCRIPT` and `SIDECAR_SCRIPT` (`app/utils/play/script/`) for the product moments, typed keys and their ids, and film's `films/scripts/<film>.ts` for the camera pushes, the pull-back, the island opening, the seam and the end-card line. A beat that moves in either file moves the sound after `build` and `verify`.
- Film reads only the spoken lines back from `cues.json` (`text`, `atMs`, `durMs`), so the voice cue ids and the files in `sage/sources/` stay as they are.
- `cues.json` lists every cue with its `atMs` and what it `marks`. `typing[]` carries `presses[]`, the time of each character, and `ducks[]` the bed ducks with their depth, attack and release.
- The bed ducks at least 6 dB under every voice line with a 120 ms attack and a 400 ms release, deeper where the speech band needs it. The UI stem is never ducked.
- `edges.ts` proves the base cases: a cue at sample 0, a cue ending on the last sample, overflow, duplicate ids and silence with no cues.
- `stems/voice.flac` exists for Sage only and can be dropped: `mix.wav` is `music + ui + voice`.
