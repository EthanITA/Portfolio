export type Run = string | { code: string } | { strong: string } | { metric: string };

export type GlyphName =
  | "asks"
  | "changes"
  | "comments"
  | "follows"
  | "hands"
  | "looks"
  | "pipe"
  | "review"
  | "steps"
  | "talk"
  | "undone";

export type Beat = { title: string; text: Run[]; glyph: GlyphName };
