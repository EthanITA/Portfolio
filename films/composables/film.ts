import type { Seekable } from "#shared/types/seekable";
import type {} from "~~/tools/render/contract";

export type FilmSeekable = Seekable & { ready?: () => Promise<void> };

export const useFilm = (film: FilmSeekable): void => {
  onMounted(() => {
    Object.defineProperty(window, "__duration", { configurable: true, get: () => film.duration });
    window.__seek = async (ms) => {
      film.seek(ms);
      await nextTick();
    };
    window.__ready = async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((image) => image.decode()));
      await film.ready?.();
    };
  });

  onBeforeUnmount(() => {
    Reflect.deleteProperty(window, "__duration");
    Reflect.deleteProperty(window, "__seek");
    Reflect.deleteProperty(window, "__ready");
  });
};
