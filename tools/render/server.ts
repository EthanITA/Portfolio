import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

export type Server = { origin: string; stop: () => void };

const status = async (url: string): Promise<number> => {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    return response.status;
  } catch {
    return 0;
  }
};

export const serve = async ({ route, port = 3105, root, timeout = 180_000 }: { route: string; port?: number; root: string; timeout?: number }): Promise<Server> => {
  const origin = `http://localhost:${port}`;
  const running = await status(`${origin}${route}`);
  if (running === 200) return { origin, stop: () => {} };
  if (running) throw new Error(`${origin}${route} answered ${running}; the server on :${port} has to run with FILM=1`);

  const child = spawn("pnpm", ["exec", "nuxt", "dev", "--port", String(port), "--host", "localhost"], {
    cwd: root,
    env: { ...process.env, FILM: "1" },
    stdio: "ignore",
    detached: true,
  });
  let alive = true;
  child.once("exit", () => {
    alive = false;
  });
  const stop = (): void => {
    if (alive && child.pid) process.kill(-child.pid, "SIGTERM");
  };
  process.once("exit", stop);
  process.once("SIGINT", () => {
    stop();
    process.exit(130);
  });

  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (!alive) throw new Error(`nuxt dev exited with ${child.exitCode}`);
    if ((await status(`${origin}${route}`)) === 200) return { origin, stop };
    await sleep(1000);
  }
  stop();
  throw new Error(`nuxt dev on :${port} did not serve ${route} within ${timeout} ms`);
};
