import { Sky, type Pose } from "./sky.ts";

const offsets = (word: HTMLElement): number[] => {
  const node = word.firstChild;
  if (!(node instanceof Text)) return [];
  const left = word.getBoundingClientRect().left;
  const range = document.createRange();
  let start = 0;
  return Sky.letters(word.textContent ?? "").map((letter) => {
    range.setStart(node, start);
    range.setEnd(node, start + letter.length);
    start += letter.length;
    return range.getBoundingClientRect().left - left;
  });
};

// Unicode-range subsets load per glyph, so each face is asked for with the text it has to set.
const load = (root: HTMLElement, selector: string): Promise<unknown> => {
  const texts = new Map<string, string>();
  for (const element of root.querySelectorAll<HTMLElement>(selector)) {
    const { fontWeight, fontSize, fontFamily } = getComputedStyle(element);
    const font = `${fontWeight} ${fontSize} ${fontFamily}`;
    texts.set(font, `${texts.get(font) ?? ""}${element.textContent ?? ""}`);
  }
  return Promise.all([...texts].map(([font, text]) => document.fonts.load(font, text)));
};

const apply = (element: HTMLElement, { opacity, y, blur, scale }: Pose): void => {
  element.style.opacity = String(opacity);
  element.style.transform = y || scale !== 1 ? `translateY(${y}em) scale(${scale})` : "";
  element.style.filter = blur ? `blur(${blur}px)` : "none";
};

export type Mover = { element: HTMLElement; at: number; leave: number; swell: boolean };

const movers = (root: HTMLElement): Mover[] =>
  [...root.querySelectorAll<HTMLElement>("[data-at]")].map((element) => ({ element, at: Number(element.dataset.at), leave: Number(element.dataset.leave), swell: "swell" in element.dataset }));

export const Glyphs = { offsets, load, apply, movers };
