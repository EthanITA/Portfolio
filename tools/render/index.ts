import { mux, poster, sequence, video } from "./encode.ts";
import { checkFrames, Frame, renderFrames } from "./frames.ts";
import { band, black, frozen, loudness, media } from "./probe.ts";
import { serve } from "./server.ts";

export const Render = { frames: renderFrames, check: checkFrames, serve, Frame };
export const Encode = { video, mux, sequence, poster };
export const Probe = { media, black, frozen, loudness, band };

export type { FilmGlobals } from "./contract.ts";
export type { SequenceFormat, SequenceOptions, VideoCodec, VideoOptions } from "./encode.ts";
export type { Frames, FramesOptions, Mismatch } from "./frames.ts";
export type { Band, Loudness, Media, Stretch } from "./probe.ts";
export type { Server } from "./server.ts";
