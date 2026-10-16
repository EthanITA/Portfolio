import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const ENDPOINT = "https://openrouter.ai/api/v1";
const SPEND_LOG = "/Users/madong/.claude/jobs/e4337bca/tmp/site/spend.log";

export type AudioRequest = {
  model: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  audio?: { voice?: string; format: string };
  seed?: number;
  stream?: boolean;
};

export type AudioResult = {
  audio: Buffer;
  transcript: string;
  text: string;
  id?: string;
  cost?: number;
  shape: unknown;
};

type Delta = { content?: string; audio?: { data?: string; transcript?: string } };
type Payload = {
  id?: string;
  choices?: Array<{ delta?: Delta; message?: Delta & { content?: unknown } }>;
  usage?: { cost?: number };
  error?: { message?: string };
};

const bearer = (): Record<string, string> => {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not set");
  return { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
};

export const skeleton = (value: unknown): unknown => {
  if (typeof value === "string") return value.length > 80 ? `<string ${value.length} chars>` : value;
  if (Array.isArray(value)) return value.slice(0, 6).map(skeleton);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, skeleton(v)]));
  return value;
};

const fetchCost = async (id: string): Promise<number | undefined> => {
  for (let attempt = 0; attempt < 6; attempt++) {
    await new Promise((r) => setTimeout(r, 2500));
    const res = await fetch(`${ENDPOINT}/generation?id=${encodeURIComponent(id)}`, { headers: bearer() });
    if (!res.ok) continue;
    const body = (await res.json()) as { data?: { total_cost?: number } };
    if (typeof body.data?.total_cost === "number") return body.data.total_cost;
  }
  return undefined;
};

export const requestAudio = async (req: AudioRequest): Promise<AudioResult> => {
  const stream = req.stream ?? true;
  const res = await fetch(`${ENDPOINT}/chat/completions`, {
    method: "POST",
    headers: bearer(),
    signal: AbortSignal.timeout(420_000),
    body: JSON.stringify({
      model: req.model,
      messages: req.messages,
      modalities: ["text", "audio"],
      ...(req.audio && { audio: req.audio }),
      ...(typeof req.seed === "number" && { seed: req.seed }),
      stream,
      ...(stream && { stream_options: { include_usage: true } }),
    }),
  });
  if (!res.ok) throw new Error(`${req.model} answered ${res.status}: ${(await res.text()).slice(0, 600)}`);

  const audio: string[] = [];
  const transcript: string[] = [];
  const text: string[] = [];
  let id: string | undefined;
  let cost: number | undefined;
  const seen: unknown[] = [];

  const take = (p: Payload): void => {
    id ??= p.id;
    if (p.error) throw new Error(`${req.model} error: ${p.error.message}`);
    if (typeof p.usage?.cost === "number") cost = p.usage.cost;
    for (const c of p.choices ?? []) {
      const d = c.delta ?? c.message;
      if (!d) continue;
      if (d.audio?.data) audio.push(d.audio.data);
      if (d.audio?.transcript) transcript.push(d.audio.transcript);
      if (typeof d.content === "string") text.push(d.content);
    }
  };

  if (stream) {
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop()!;
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;
        const p = JSON.parse(data) as Payload;
        if (seen.length < 4) seen.push(skeleton(p));
        take(p);
      }
    }
  } else {
    const p = (await res.json()) as Payload;
    seen.push(skeleton(p));
    take(p);
  }

  if (id && !cost) cost = (await fetchCost(id)) ?? cost;
  return { audio: Buffer.from(audio.join(""), "base64"), transcript: transcript.join(""), text: text.join(""), id, cost, shape: seen };
};

export const logSpend = async (model: string, what: string, cost: number | undefined): Promise<void> => {
  await appendFile(SPEND_LOG, `${new Date().toISOString()} sound ${model} ${what} usage.cost=${cost ?? "unknown"}\n`);
};

export const writeJson = async (file: string, value: unknown): Promise<void> => {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, undefined, 2)}\n`);
};
