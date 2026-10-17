export type Product = "sidecar" | "sage" | "shell";

export type Film = { webm: string; mp4: string; poster: string };

const film = (product: Product): Film => ({
  webm: `/films/${product}.webm`,
  mp4: `/films/${product}.mp4`,
  poster: `/films/${product}-poster.webp`,
});

export const films: Partial<Record<Product, Film>> = { shell: film("shell"), sage: film("sage") };
