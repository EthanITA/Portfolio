export type FilmGlobals = {
  __duration: number;
  __seek: (ms: number) => Promise<void> | void;
  __ready: () => Promise<void>;
};

declare global {
  interface Window extends FilmGlobals {}
}
