export type Product = "sidecar" | "sage" | "shell";

export type Cut = { webm: string; mp4: string; poster: string };

export type Film = { landscape: Cut; portrait?: Cut };

const cut = (name: string): Cut => ({
  webm: `/films/${name}.webm`,
  mp4: `/films/${name}.mp4`,
  poster: `/films/${name}-poster.webp`,
});

export const films: Partial<Record<Product, Film>> = {
  shell: { landscape: cut("shell"), portrait: cut("shell-4x5") },
  sage: { landscape: cut("sage"), portrait: cut("sage-4x5") },
};
