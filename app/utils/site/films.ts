export type Product = "sidecar" | "sage" | "shell";

export type Film = { webm: string; mp4: string; poster: string };

export const films: Partial<Record<Product, Film>> = {};
