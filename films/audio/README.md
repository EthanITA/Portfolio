# Film sound

One bed, one set of synthesized interface sounds and, for Sage, two voices per film. Cue times live in `scripts/films.ts` and come out as `<film>/cues.json`.

```
pnpm tsx films/audio/scripts/generate-music.ts <sidecar|sage|shell> [--take N] [--force]
pnpm tsx films/audio/scripts/generate-voice.ts sage [--only cue-id] [--force]
pnpm tsx films/audio/scripts/build.ts <film> [--take N] [--dry]
pnpm tsx films/audio/scripts/verify.ts [film] [--rebuild]
```

- `generate-*` pay OpenRouter once and write `<film>/sources/`, which is committed so a rebuild never pays again. Each call is appended to the team's `spend.log`.
- `build` reads only `sources/` and `films.ts`, so it runs offline and is bit-identical. It writes `mix.wav` (48 kHz stereo, 24-bit, -16 LUFS integrated, true peak at or under -1.5 dBTP), `stems/*.flac` and `cues.json`. Cue and voice levels are fixed, the bed gain is what lands the loudness.
- A retime is an edit to the cue times in `films.ts` followed by `build` and `verify`.
- `stems/voice.flac` exists for Sage only and can be dropped: `mix.wav` is `music + ui + voice`.
