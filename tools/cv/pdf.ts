import { copyFile, readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { extname, join, normalize } from "node:path";

import { chromium } from "playwright";

const root = join(import.meta.dirname, "../..");
const site = join(root, ".output/public");
const file = "marco-dong-cv.pdf";

const types: Record<string, string> = {
  ".css": "text/css",
  ".html": "text/html",
  ".js": "text/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};

const resolve = async (path: string): Promise<string | undefined> => {
  const base = join(site, normalize(decodeURIComponent(path)));
  if (!base.startsWith(site)) return;
  for (const candidate of [base, join(base, "index.html"), `${base}.html`]) {
    const info = await stat(candidate).catch(() => undefined);
    if (info?.isFile()) return candidate;
  }
};

const server = createServer(async (req, res) => {
  const path = await resolve(new URL(req.url ?? "/", "http://localhost").pathname);
  if (!path) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { "content-type": types[extname(path)] ?? "application/octet-stream" });
  res.end(await readFile(path));
});

await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
const { port } = server.address() as AddressInfo;

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.emulateMedia({ colorScheme: "light", media: "print" });
  await page.goto(`http://127.0.0.1:${port}/cv`, { waitUntil: "networkidle" });
  await page.waitForSelector('a[href^="mailto:"]');
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: join(root, "public", file), preferCSSPageSize: true });
  await copyFile(join(root, "public", file), join(site, file));
  console.log(`public/${file}`);
} finally {
  await browser.close();
  server.close();
}
