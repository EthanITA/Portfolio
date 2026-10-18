(() => {
  const raf = window.requestAnimationFrame.bind(window);
  const calls = new Map();
  let counting = false;
  window.requestAnimationFrame = (callback) => {
    if (counting) calls.set(callback, (calls.get(callback) ?? 0) + 1);
    return raf(callback);
  };

  const wait = (ms) => new Promise((done) => setTimeout(done, ms));
  const SKIP = ".play-frame, [data-scene], [data-play-chip]";
  const OWNED = "[data-scene], .play-frame";
  const INLINE = new Set(["A", "ABBR", "B", "CODE", "DATA", "EM", "I", "KBD", "LABEL", "MARK", "S", "SMALL", "SPAN", "STRONG", "SUB", "SUP", "TIME", "U"]);
  const inView = (el) => {
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth && r.width > 0 && r.height > 0;
  };
  const meet = (a, b) => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
  const round = (n) => Math.round(n * 10) / 10;

  // The part of an element its scrolling and clipping ancestors leave on screen, since a terminal's scrolled-out lines still report their rects.
  const shown = (el) => {
    const box = el.getBoundingClientRect();
    let { left, top, right, bottom } = box;
    for (let parent = el.parentElement; parent; parent = parent.parentElement) {
      if (getComputedStyle(parent).overflow === "visible") continue;
      const clip = parent.getBoundingClientRect();
      left = Math.max(left, clip.left);
      top = Math.max(top, clip.top);
      right = Math.min(right, clip.right);
      bottom = Math.min(bottom, clip.bottom);
    }
    return { left, top, right, bottom };
  };

  // anime's own inline values, since an ease-out reads as landed in computed style well before its tween ends.
  const words = new Map();
  const sampleWords = () => {
    const now = performance.now();
    for (const el of document.querySelectorAll("[data-word]")) {
      const inline = el.style.opacity;
      let seen = words.get(el);
      if (!seen) words.set(el, (seen = { text: (el.textContent ?? "").trim() }));
      if (inline && Number(inline) > 0 && !seen.start) seen.start = now;
      if (seen.start && !seen.end && (inline === "1" || !inline)) seen.end = now;
    }
    raf(sampleWords);
  };
  if (window.__sweepWords) raf(sampleWords);

  const selector = (el) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}${el.classList.length ? `.${[...el.classList].slice(0, 2).join(".")}` : ""}`;
  const text = (el) => (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 48);
  const block = (node) => {
    let el = node.parentElement;
    while (el && INLINE.has(el.tagName)) el = el.parentElement;
    return el;
  };
  const glyph = (node, at) => {
    const range = document.createRange();
    range.setStart(node, at);
    range.setEnd(node, at + 1);
    return range.getClientRects()[0];
  };

  window.__sweep = {
    scrollTo: async (top, settle) => {
      scrollTo({ top, behavior: "instant" });
      await wait(settle);
    },

    extent: () => ({ height: document.documentElement.scrollHeight, view: innerHeight }),

    nav: () => {
      const bar = document.querySelector("header.bar");
      const box = bar?.querySelector(".island .responsive-box");
      const rect = box?.getBoundingClientRect();
      const ms = (value) => (value.endsWith("ms") ? parseFloat(value) : parseFloat(value) * 1000);
      const token = (name) => ms(getComputedStyle(document.documentElement).getPropertyValue(name).trim());
      const links = [...(bar?.querySelectorAll(".island .items a") ?? [])].filter((a) => {
        const visible = shown(a);
        return visible.right - visible.left > 1 && a.checkVisibility({ opacityProperty: true });
      });
      return {
        w: round(rect?.width ?? 0),
        h: round(rect?.height ?? 0),
        folded: bar?.dataset.folded === "true",
        links: links.length,
        tween: bar?.dataset.tween ?? "",
        animated: box?.dataset.animated === "true",
        duration: box ? ms(getComputedStyle(box).transitionDuration.split(",")[0]) : 0,
        fast: token("--duration-fast"),
        moderate: token("--duration-moderate"),
      };
    },

    // rAF calls over the window, grouped by callback, against the loops the motion rules allow while in view.
    idle: async (ms) => {
      const scenes = [...document.querySelectorAll("[data-scene=hero], [data-scene=line], [data-scene=fence]")].filter((el) => el.dataset.state === "live" && inView(el)).map((el) => el.dataset.scene);
      const demo = [...document.querySelectorAll(".play-frame[data-driver=demo]")].some(inView);
      calls.clear();
      counting = true;
      await wait(ms);
      counting = false;
      const callbacks = [...calls].map(([callback, n]) => ({ n, key: callback.toString().replace(/\s+/g, " ").slice(0, 72) }));
      const engine = window.AnimeJS?.[0]?.engine;
      let ticking = 0;
      for (let t = engine?._head; t; t = t._next) ticking++;
      return { total: callbacks.reduce((sum, c) => sum + c.n, 0), callbacks, scenes, demo, ticking, scrollY: Math.round(scrollY), running: document.getAnimations().filter((a) => a.playState === "running").length };
    },

    entered: () => {
      const hidden = [];
      for (const el of document.querySelectorAll("main [data-enter]")) {
        if (el.closest(SKIP)) continue;
        const opacity = Number(getComputedStyle(el).opacity);
        if (opacity < 0.999 || (document.documentElement.dataset.motion === "on" && !("entered" in el.dataset) && el.dataset.enter !== "wide")) hidden.push(`${selector(el)} "${text(el)}" opacity ${round(opacity)}`);
      }
      return hidden;
    },

    // About's nodes arrive as the drawn head reaches their dot at mid-viewport, everything else once it is well in view.
    visible: (share) => {
      const dim = [];
      for (const el of document.querySelectorAll("main [data-enter]")) {
        if (el.closest(SKIP) || !inView(el)) continue;
        const dot = el.closest("[data-node]")?.querySelector("[data-dot]")?.getBoundingClientRect();
        const due = dot ? dot.top + dot.height / 2 <= innerHeight / 2 + 1 : el.getBoundingClientRect().top <= innerHeight * share;
        if (!due) continue;
        const opacity = Number(getComputedStyle(el).opacity);
        if (opacity < 0.99) dim.push(`${selector(el)} "${text(el)}" opacity ${round(opacity)}`);
      }
      return dim;
    },

    counts: () => [...document.querySelectorAll("[data-counter]")].map((el) => el.textContent ?? ""),

    stagger: () => {
      const headings = new Map();
      for (const [el, seen] of words) {
        const heading = el.closest("h1, h2, h3");
        if (!heading || !seen.start) continue;
        if (!headings.has(heading)) headings.set(heading, []);
        headings.get(heading).push(seen);
      }
      return [...headings].map(([, list]) => {
        const starts = list.map((s) => s.start).sort((a, b) => a - b);
        const step = starts.length > 1 ? (starts.at(-1) - starts[0]) / (starts.length - 1) : 0;
        const end = Math.max(...list.map((s) => s.end ?? Infinity));
        return { heading: list.map((s) => s.text).join(" ").slice(0, 48), words: list.length, total: Math.round(end - starts[0]), step: Math.round(step) };
      });
    },

    layout: () => {
      const main = document.querySelector("main#content");
      const root = main?.firstElementChild;
      const h1 = main?.querySelector("h1");
      const footer = [...document.querySelectorAll("footer")].find((el) => !el.closest("main"));
      const last = root?.lastElementChild;
      const headings = [...(main?.querySelectorAll("h1, h2") ?? [])].filter((el) => !el.closest(SKIP) && !el.closest(".sr-only")).map((el) => ({ el: `${selector(el)} "${text(el)}"`, wrap: getComputedStyle(el).textWrapStyle }));
      const minor = [...(main?.querySelectorAll(".beats h3, .rules h3, [data-rule] h3") ?? [])].map((el) => ({ el: `${selector(el)} "${text(el)}"`, size: parseFloat(getComputedStyle(el).fontSize) }));
      // A card's body is not a lead, and a subtitle set at heading size balances like the heading above it.
      const leads = [...(main?.querySelectorAll("h1 + p, h2 + p, header h1 ~ p") ?? [])]
        .filter((el) => !el.closest(SKIP) && !el.closest("[data-surface]"))
        .map((el) => {
          const style = getComputedStyle(el);
          return { el: `${selector(el)} "${text(el)}"`, wrap: style.textWrapStyle, want: parseFloat(style.fontSize) >= 20 ? "balance" : "pretty" };
        });
      const measures = [];
      for (const p of main?.querySelectorAll("p") ?? []) {
        if (p.closest(SKIP) || !text(p)) continue;
        // Code lines and paths keep their figure's width; the measure is a reading width for prose.
        if (/mono/i.test(getComputedStyle(p).fontFamily)) continue;
        let box = p;
        while (box && getComputedStyle(box).display === "inline") box = box.parentElement;
        if (!box) continue;
        const style = getComputedStyle(box);
        const width = box.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
        measures.push({ el: `${selector(p)} "${text(p)}"`, ratio: round(width / (parseFloat(getComputedStyle(p).fontSize) / 2)) });
      }
      return {
        root: root ? selector(root) : "",
        gap: root ? parseFloat(getComputedStyle(root).rowGap) || 0 : 0,
        h1: h1 ? parseFloat(getComputedStyle(h1).fontSize) : 0,
        headings,
        minor,
        leads,
        measures,
        footerGap: footer && last ? round(footer.getBoundingClientRect().top - last.getBoundingClientRect().bottom) : NaN,
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    },

    // Plan section 7: no playground element under the driver chip's box, read apart for a bar stuck under the nav.
    chip: () =>
      [...document.querySelectorAll("[data-play-chip]")].filter(inView).map((chip) => {
        const box = chip.getBoundingClientRect();
        let sticky = chip.parentElement;
        while (sticky && getComputedStyle(sticky).position !== "sticky") sticky = sticky.parentElement;
        const stuck = !!sticky && sticky.getBoundingClientRect().top <= (parseFloat(getComputedStyle(sticky).top) || 0) + 0.5;
        const under = [];
        for (const frame of document.querySelectorAll(".play-frame")) {
          for (const el of frame.querySelectorAll("*")) {
            const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.data.trim()) || el.matches("button, input, textarea, select, a[href], [role=button]");
            if (!own || !el.checkVisibility({ opacityProperty: true, visibilityProperty: true }) || !meet(box, shown(el))) continue;
            under.push(`${selector(el)} "${text(el)}"`);
          }
        }
        return { stuck, under };
      }),

    // Every target a finger can press, sized with its hit-area pseudo-element, inline links inside a sentence excepted.
    targets: () => {
      const small = [];
      for (const el of document.querySelectorAll("a[href], button, summary, input, select, textarea, [role=button], [tabindex]:not([tabindex='-1'])")) {
        if (el.closest(".segmented, [inert], .sr-only") || el.matches(".sr-only, .skip")) continue;
        const style = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        if (r.width <= 1 || r.height <= 1 || style.visibility === "hidden") continue;
        if (style.display === "inline" && el.parentElement && (el.parentElement.textContent ?? "").trim() !== (el.textContent ?? "").trim()) continue;
        const after = getComputedStyle(el, "::after");
        const hit = after.content !== "none" && after.position === "absolute" ? { w: parseFloat(after.width) || 0, h: parseFloat(after.height) || 0 } : { w: 0, h: 0 };
        const size = Math.min(Math.max(r.width, hit.w), Math.max(r.height, hit.h));
        small.push({ el: `${selector(el)} "${text(el)}" ${round(Math.max(r.width, hit.w))}x${round(Math.max(r.height, hit.h))}`, size, owned: !!el.closest(OWNED) });
      }
      return small;
    },

    // Two runs of text set apart on screen with no whitespace between them in the HTML the text twins are built from.
    junctions: () => {
      const found = [];
      // No filter callback, because the no-JS pass can't call back into the page.
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let previous;
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (node.parentElement?.closest("script, style, noscript, template, svg")) continue;
        if (!node.data.trim()) {
          previous = undefined;
          continue;
        }
        const before = previous;
        previous = /\s$/.test(node.data) ? undefined : node;
        if (!before || /^\s/.test(node.data) || block(before) !== block(node)) continue;
        const range = document.createRange();
        range.setStartAfter(before);
        range.setEndBefore(node);
        if (range.cloneContents().querySelector("br, img")) continue;
        const end = before.data.trimEnd();
        const a = glyph(before, end.length - 1);
        const b = glyph(node, node.data.length - node.data.trimStart().length);
        if (!a || !b) continue;
        const em = parseFloat(getComputedStyle(node.parentElement).fontSize);
        const apart = Math.abs(a.top - b.top) > a.height / 2 || b.left - a.right > em * 0.25 || b.left < a.left;
        if (apart) found.push(`"${end.slice(-16)}|${node.data.trimStart().slice(0, 16)}" in ${selector(block(node))}`);
      }
      return found;
    },

    // :hover rules that move something, outside a hover-and-fine-pointer query.
    hoverMotion: () => {
      const offenders = [];
      const moves = /(^|-)(transform|translate|scale|rotate)/;
      const used = (selectors) =>
        selectors.split(",").some((one) => {
          try {
            return !!document.querySelector(one.replace(/::?(hover|focus-visible|focus|active|after|before|placeholder)\b/g, "").trim() || "*");
          } catch {
            return true;
          }
        });
      const walk = (rules, media) => {
        for (const rule of rules) {
          const condition = rule.conditionText ?? rule.media?.mediaText;
          const scope = condition ? [...media, condition] : media;
          if (rule.selectorText?.includes(":hover") && used(rule.selectorText)) {
            const fine = scope.some((c) => c.includes("hover: hover") && c.includes("pointer: fine"));
            const moving = [...rule.style].some((prop) => moves.test(prop.replace(/^--tw-/, "")));
            if (moving && !fine) offenders.push(`${rule.selectorText} under ${scope.join(" / ") || "no query"}`);
          }
          if (rule.cssRules) walk(rule.cssRules, scope);
        }
      };
      for (const sheet of document.styleSheets) {
        try {
          walk(sheet.cssRules, []);
        } catch {
          offenders.push(`unreadable sheet ${sheet.href}`);
        }
      }
      return [...new Set(offenders)];
    },
  };
})();
