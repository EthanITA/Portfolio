import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { chromium } from "playwright";

const pub = join(import.meta.dirname, "../../public");
const sizes: Record<string, number> = { "apple-touch-icon.png": 180, "icon-192.png": 192, "icon-512.png": 512 };
const ICO = 32;

// One PNG inside an ICO container, which every browser and crawler that still asks for /favicon.ico reads.
const ico = (png: Buffer): Buffer => {
  const head = Buffer.alloc(22);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(1, 4);
  head.writeUInt8(ICO, 6);
  head.writeUInt8(ICO, 7);
  head.writeUInt16LE(1, 10);
  head.writeUInt16LE(32, 12);
  head.writeUInt32LE(png.length, 14);
  head.writeUInt32LE(22, 18);
  return Buffer.concat([head, png]);
};

const svg = await readFile(join(pub, "favicon.svg"), "utf8");
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const render = async (size: number): Promise<Buffer> => {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`);
    return page.screenshot({ omitBackground: true });
  };
  for (const [file, size] of Object.entries(sizes)) {
    await writeFile(join(pub, file), await render(size));
    console.log(`public/${file}`);
  }
  await writeFile(join(pub, "favicon.ico"), ico(await render(ICO)));
  console.log("public/favicon.ico");
} finally {
  await browser.close();
}
