// Shared paths, environment loading and small helpers.
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const MCP_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const REPO_ROOT = resolve(MCP_DIR, "..");
export const SCRIPT_CV = resolve(REPO_ROOT, "scripts/generate-cv.mjs");
export const SCRIPT_LETTER = resolve(REPO_ROOT, "scripts/generate-letter.mjs");
export const DEFAULT_PHOTO = resolve(REPO_ROOT, "assets/photo.jpg");

// Candidature root on the synced drive; override with CV_ROOT.
export const CV_ROOT = process.env.CV_ROOT || "G:/My Drive/CV";

let cachedEnv = null;

// Secrets come from <CV_ROOT>/.env first, then the ambient environment.
// The file wins on purpose: a stale SUPABASE_URL pointing at the decommissioned
// Supabase project still lingers in the shell environment on this machine.
export function secrets() {
  if (cachedEnv) return cachedEnv;
  const out = { url: "", key: "" };
  const envFile = resolve(CV_ROOT, ".env");
  if (existsSync(envFile)) {
    for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (!m) continue;
      const v = m[2].replace(/^["']|["']$/g, "");
      if (m[1] === "SUPABASE_URL") out.url = v;
      if (m[1] === "SUPABASE_SERVICE_ROLE_KEY") out.key = v;
    }
  }
  out.url = out.url || process.env.SUPABASE_URL || "";
  out.key = out.key || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  cachedEnv = out;
  return out;
}

export class ToolError extends Error {}

// Every failure an agent sees should say what to do next.
export function fail(what, fix) {
  throw new ToolError(`${what}\n\nHow to fix: ${fix}`);
}
