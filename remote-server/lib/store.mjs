// Generated documents live on disk under an unguessable id and are served over HTTP,
// because a remote caller has no filesystem in common with this service.
import { createHash, randomBytes } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";

export const DATA_DIR = resolve(process.env.DATA_DIR || "/data/documents");
export const PUBLIC_URL = (process.env.PUBLIC_URL || "").replace(/\/$/, "");
const TTL_DAYS = Number(process.env.FILE_TTL_DAYS || 14);

mkdirSync(DATA_DIR, { recursive: true });

const safe = (name) => basename(name).replace(/[^A-Za-z0-9._ -]/g, "_");

// One directory per build, so a CV and its PDF share an id and expire together.
export function newBundle() {
  const id = randomBytes(12).toString("hex");
  const dir = join(DATA_DIR, id);
  mkdirSync(dir, { recursive: true });
  return { id, dir };
}

export function publish(bundle, filePath) {
  const name = safe(basename(filePath));
  const dest = join(bundle.dir, name);
  if (resolve(dest) !== resolve(filePath)) copyFileSync(filePath, dest);
  return {
    name,
    path: dest,
    url: PUBLIC_URL ? `${PUBLIC_URL}/files/${bundle.id}/${encodeURIComponent(name)}` : dest,
    bytes: statSync(dest).size,
  };
}

// Resolve a request path back to a file, refusing anything that escapes the store.
export function locate(id, name) {
  if (!/^[0-9a-f]{24}$/.test(id)) return null;
  const file = join(DATA_DIR, id, safe(name));
  if (!existsSync(file) || !resolve(file).startsWith(DATA_DIR)) return null;
  return file;
}

// Bundles are disposable: the caller downloads them, then they are noise on a shared box.
export function sweep() {
  const cutoff = Date.now() - TTL_DAYS * 86400000;
  let removed = 0;
  for (const entry of readdirSync(DATA_DIR)) {
    const dir = join(DATA_DIR, entry);
    try {
      if (statSync(dir).mtimeMs < cutoff) {
        rmSync(dir, { recursive: true, force: true });
        removed++;
      }
    } catch {
      // a bundle vanishing under us is fine
    }
  }
  return removed;
}

export const fingerprint = (s) => createHash("sha256").update(s).digest("hex").slice(0, 12);
