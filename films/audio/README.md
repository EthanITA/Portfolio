# Film sound

One bed, one set of synthesized interface sounds, a narrator on every film and, for Sage, two product voices. Every cue time comes from film-director's timing sheets (`scripts/sheets.ts`) on a 120 bpm grid and goes out as `<film>/cues.json`.

```
pnpm tsx films/audio/scripts/generate-voice.ts <sidecar|sage|shell> [--only cue-id] [--force] [--quicker] [--room ms]
pnpm tsx films/audio/scripts/align.ts <sidecar|sage|shell> [--only cue-id]
pnpm tsx films/audio/scripts/build.ts <film> [--take N] [--bed synth|lyria] [--dry]
pnpm tsx films/audio/scripts/verify.ts [film] [--rebuild]
pnpm tsx films/audio/scripts/edges.ts
```

- `generate-*` pay OpenRouter once and write `<film>/sources/`, which is committed so a rebuild never pays again. Each call is appended to the team's `spend.log`.
- `build` reads only `sources/`, `sheets.ts` and `films.ts`, so it runs offline and is bit-identical. It writes `mix.wav` (48 kHz stereo, 24-bit, -16 LUFS integrated, true peak under -1 dBTP), `stems/*.flac` and `cues.json`. Cue and voice levels are fixed, the bed gain is what lands the loudness.
- `sheets.ts` holds each film's close, breakdown, bed stabs and narrator lines with their anchor word and the beat it sits on, plus the moment times. `films.ts` takes the text and typing cadence from play's scripts and retimes every cue to those moments, so a moment that moves in `sheets.ts` moves the sound.
- The bed is `synth`, a 120 bpm groove in D from `scripts/lib/groove.ts` and `scripts/lib/bed.ts`: a kick on every beat from 0, hats, bass, plucks, claps on the offbeats, stabs only at the named accents, a breakdown of kick and bass, and a closing hit (kick, bass root, the D chord ringing out) on the close beat. `cues.json` carries `bed` with the grid, `closeMs`, the breakdown, every section and every accent.
- The closing hit and the `line-end-card` line share one beat, within 20 ms. Whooshes are `islandOpen` (500 ms at 2000, every film) and `noteArc` (Sidecar, 1000 ms) only.
- A narrator take is placed so the first sound of its anchor word lands 15 ms before the anchor's beat (`ANCHOR_LEAD_MS`). `cues.json` gives every voice cue `words[]` in film time (`text`, `startMs`, `endMs`), `onsetMs`, `endMs`, `fromMs`, `untilMs` and, for the narrator, `anchor` (`word`, `beatMs`), and the file carries `mixSha256`.
- `?`, `⌘Z` and `50` are spoken as "a question mark", "Command Z" and "fifty" (`spokenForm`), while `cues.json` keeps the written text. `build` closes any pause inside a narrator line longer than 180 ms down to 120 ms (`NARRATOR_PAUSES`), because the model leaves a long gap after a question mark.

## Word times

`<film>/sources/words.json` holds the start and end of every written word of every voice take, and `build` refuses a take whose sha no longer matches it (run `align.ts`). `align.ts` runs three small tools in throwaway `uv run` environments, so nothing is installed globally and the only download is `faster-whisper`'s `small` model into the default cache:

- `pocketsphinx` force-aligns the written line against the take and gives the word starts.
- `faster-whisper small` transcribes the take, which proves the take says its line and gives a second opinion on each start.
- A start that sits in or just before a gap moves to where sound resumes, because aligners begin a word at its stop closure or the pause before it.
- Where the two aligners differ by more than 60 ms, `tail_words.py` cuts the take every 20 ms and transcribes what is left. A word cannot start before the last cut that still hears its predecessor, so the earlier aligner start past that point wins.

Each word carries `onset`: `silence` (moved to where sound resumes), `aligned` (both aligners within 60 ms), `tail` (settled by the cut test) or `contested` (the cut test could not settle it, listen to it). A word start is good to about 30 ms. The first word of a take starts at 0, since the take is trimmed to its first sound.

## Checks

- `verify` runs per film: durations, clipping, loudness, true peak, stems summing to the mix, every cue's onset by energy and by waveform, silence outside cues, the bed under every voice, the grid and the close, a kick on every beat and none after the close, the breakdown layers, the whoosh set, `mixSha256`, the words reading as each line is written, every anchor 0 to 30 ms before its beat, 150 ms between narrator lines and 200 ms from the last word of one voice to the first word of the next against Sage's own voices. `--rebuild` also proves the build is bit-identical.
- `edges.ts` proves the base cases: a cue at sample 0, a cue ending on the last sample, overflow, duplicate ids and silence with no cues.
- `stems/voice.flac` can be dropped: `mix.wav` is `music + ui + voice`. The bed ducks at least 6 dB under every voice line with a 120 ms attack and a 400 ms release, and the UI stem is never ducked.
