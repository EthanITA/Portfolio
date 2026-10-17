import { createTimeline, type Timeline } from "animejs";
import type { InjectionKey } from "vue";
import type { Seekable } from "#shared/types/seekable";
import type {} from "~~/tools/render/contract";

export type FilmSeekable = Seekable & { ready?: () => Promise<void> };

export type FilmContext = {
  timeline: Timeline;
  onFrame: (render: (ms: number) => Promise<void> | void) => void;
  measure: <T>(points: number[], read: (index: number) => T) => Promise<T[]>;
  defer: (setup: Promise<unknown>) => void;
};

const FILM: InjectionKey<FilmContext> = Symbol("film");

export const useFilm = (film: FilmSeekable): FilmContext => {
  // The default "replace" composition renders the wrong value when a seek jumps back between two tweens on one property.
  const timeline = createTimeline({ autoplay: false, defaults: { composition: "none" } });
  const renders: ((ms: number) => Promise<void> | void)[] = [];
  let current = 0;

  const measure = async <T>(points: number[], read: (index: number) => T): Promise<T[]> => {
    const values: T[] = [];
    for (const [index, ms] of points.entries()) {
      film.seek(ms);
      await nextTick();
      values.push(read(index));
    }
    film.seek(current);
    await nextTick();
    return values;
  };

  // Setup that waits on fonts or layout must finish before the renderer's first seek, or a fresh page shows it unbuilt.
  const setups: Promise<unknown>[] = [];

  const context: FilmContext = { timeline, onFrame: (render) => renders.push(render), measure, defer: (setup) => setups.push(setup) };
  provide(FILM, context);

  onMounted(() => {
    Object.defineProperty(window, "__duration", { configurable: true, get: () => film.duration });
    window.__seek = async (ms) => {
      current = ms;
      timeline.seek(ms);
      film.seek(ms);
      await nextTick();
      for (const render of renders) await render(ms);
    };
    window.__ready = async () => {
      await document.fonts.ready;
      await Promise.all(setups);
      await Promise.all([...document.images].map((image) => image.decode()));
      await film.ready?.();
    };
  });

  onBeforeUnmount(() => {
    Reflect.deleteProperty(window, "__duration");
    Reflect.deleteProperty(window, "__seek");
    Reflect.deleteProperty(window, "__ready");
  });

  return context;
};

export const useFilmContext = (): FilmContext => {
  const context = inject(FILM);
  if (!context) throw new Error("a film component has to sit inside a page that calls useFilm()");
  return context;
};
