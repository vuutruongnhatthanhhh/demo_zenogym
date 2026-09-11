import fs from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");

async function ensureFile(file: string, defaultContent: string) {
  const full = path.join(DATA_DIR, file);
  try {
    await fs.access(full);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(full, defaultContent, "utf-8");
  }
  return full;
}

export async function readJson<T>(file: string, defaultValue: T): Promise<T> {
  const full = await ensureFile(file, JSON.stringify(defaultValue, null, 2));
  const raw = await fs.readFile(full, "utf-8");
  return raw.trim() ? (JSON.parse(raw) as T) : defaultValue;
}

// Demo-only: serializes writes per file so concurrent requests in this
// single-process dev/demo server don't interleave and corrupt the JSON.
const writeQueues = new Map<string, Promise<unknown>>();

export async function writeJson<T>(file: string, data: T): Promise<void> {
  const full = await ensureFile(file, "[]");
  const prev = writeQueues.get(file) ?? Promise.resolve();
  const next = prev
    .catch(() => undefined)
    .then(() => fs.writeFile(full, JSON.stringify(data, null, 2), "utf-8"));
  writeQueues.set(file, next);
  await next;
}
