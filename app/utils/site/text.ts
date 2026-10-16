export type Run = string | { code: string } | { strong: string } | { metric: string };

export type Beat = { title: string; text: Run[] };
