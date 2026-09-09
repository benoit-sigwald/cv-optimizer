// The portrait is gitignored in the public repository, so a container built from git has
// no assets/photo.jpg. It is stored in cv_assets instead and written to disk at startup.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { DEFAULT_PHOTO } from "../../mcp-server/lib/env.mjs";
import { getAsset } from "../../mcp-server/lib/db.mjs";

export async function ensurePhoto() {
  if (existsSync(DEFAULT_PHOTO)) return { path: DEFAULT_PHOTO, source: "disk" };
  let rows;
  try {
    rows = await getAsset("photo");
  } catch (e) {
    return { path: null, source: "unavailable", error: e.message.split("\n")[0] };
  }
  const b64 = rows?.[0]?.data_base64;
  if (!b64) {
    return {
      path: null,
      source: "missing",
      error: "cv_assets has no photo data. The CV will render without a portrait.",
    };
  }
  mkdirSync(dirname(DEFAULT_PHOTO), { recursive: true });
  writeFileSync(DEFAULT_PHOTO, Buffer.from(b64, "base64"));
  return { path: DEFAULT_PHOTO, source: "database" };
}
