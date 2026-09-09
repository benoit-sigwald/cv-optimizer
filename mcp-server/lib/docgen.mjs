// Wraps the repo's generator scripts so DOCX layout has a single source of truth.
import { execFile } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { DEFAULT_PHOTO, SCRIPT_CV, SCRIPT_LETTER, fail } from "./env.mjs";

const run = promisify(execFile);

function scratch(name) {
  return join(mkdtempSync(join(tmpdir(), "cv-mcp-")), name);
}

export async function generateCv({ data, photo, out }) {
  const dataPath = scratch("cv.json");
  writeFileSync(dataPath, JSON.stringify(data, null, 2), "utf8");
  const photoPath = photo || (existsSync(DEFAULT_PHOTO) ? DEFAULT_PHOTO : null);
  const args = ["--data", dataPath, "--out", out];
  if (photoPath) args.push("--photo", photoPath);
  try {
    await run("node", [SCRIPT_CV, ...args], { timeout: 120000 });
  } catch (e) {
    fail(
      `The CV generator rejected the data: ${(e.stderr || e.message).trim()}`,
      "Check the CV JSON against the master shape: identity, summary, key_skills, " +
        "recent_ai_projects, career, formation. Read Master/master-cv-EN.json for a working example."
    );
  }
  return out;
}

export async function generateLetter({ body, name, contact, out }) {
  const bodyPath = scratch("letter.txt");
  writeFileSync(bodyPath, body, "utf8");
  try {
    await run("node", [SCRIPT_LETTER, "--body", bodyPath, "--name", name, "--contact", contact, "--out", out], {
      timeout: 120000,
    });
  } catch (e) {
    fail(`The letter generator failed: ${(e.stderr || e.message).trim()}`, "Check that the output directory exists.");
  }
  return out;
}
