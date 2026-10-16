export type SceneMode = "live" | "film";

export type Seekable = {
  duration: number;
  seek: (ms: number) => void;
};
