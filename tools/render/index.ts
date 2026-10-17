import { mux, poster, sequence, video } from "./encode.ts";
import { checkFrames, Frame, renderFrames, renderStill, samplePage } from "./frames.ts";
import { audio, black, frozen, loudness, media, peaks } from "./probe.ts";
import { serve } from "./server.ts";

export const Render = { frames: renderFrames, check: checkFrames, still: renderStill, sample: samplePage, serve, Frame };
export const Encode = { video, mux, sequence, poster };
export const Probe = { media, audio, black, frozen, loudness, peaks };

export type { FilmGlobals } from "./contract.ts";
export type { SequenceFormat, SequenceOptions, VideoCodec, VideoOptions } from "./encode.ts";
export type { Frames, FramesOptions, Mismatch, SampleOptions, StillOptions } from "./frames.ts";
export type { Loudness, Media, Peak, Sound, Stretch } from "./probe.ts";
export type { Server } from "./server.ts";
