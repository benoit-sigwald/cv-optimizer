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

// The database is PostgREST in front of PostgreSQL on the OCI host. It keeps Supabase's
// URL shape (/rest/v1/<table>) because the schema was migrated from there in July 2026,
// but Supabase itself is decommissioned. CV_DB_URL and CV_DB_KEY are the accurate names.
// The SUPABASE_* names still resolve, so anything already deployed with them keeps running
// until its configuration is updated.
const URL_KEYS = ["CV_DB_URL", "SUPABASE_URL"];
const KEY_KEYS = ["CV_DB_KEY", "SUPABASE_SERVICE_ROLE_KEY"];

// Values come from <CV_ROOT>/.env first, then the ambient environment. The file wins on
// purpose: a stale SUPABASE_URL pointing at the dead Supabase project still lingers in the
// shell environment on this machine, and it would otherwise shadow the real one.
export function secrets() {
  if (cachedEnv) return cachedEnv;
  const fromFile = {};
  const envFile = resolve(CV_ROOT, ".env");
  if (existsSync(envFile)) {
    for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m) fromFile[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  const pick = (names) =>
    names.map((n) => fromFile[n]).find(Boolean) || names.map((n) => process.env[n]).find(Boolean) || "";
  cachedEnv = { url: pick(URL_KEYS), key: pick(KEY_KEYS) };
  return cachedEnv;
}

export class ToolError extends Error {}

// Every failure an agent sees should say what to do next.
export function fail(what, fix) {
  throw new ToolError(`${what}\n\nHow to fix: ${fix}`);
}
