// Dossier filing: one folder per company, house naming convention, no duplicate folders.
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { CV_ROOT, fail } from "./env.mjs";

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// "Capgemini" and "Cap Gemini" must resolve to the same folder.
export function matchFolder(company) {
  if (!existsSync(CV_ROOT)) fail(`CV_ROOT does not exist: ${CV_ROOT}`, "Set CV_ROOT to the candidatures folder.");
  const target = norm(company);
  const dirs = readdirSync(CV_ROOT).filter((d) => statSync(join(CV_ROOT, d)).isDirectory());
  const exact = dirs.find((d) => norm(d) === target);
  if (exact) return { folder: exact, matched: "exact" };
  const partial = dirs.find((d) => norm(d).includes(target) || target.includes(norm(d)));
  return partial ? { folder: partial, matched: "fuzzy" } : { folder: null, matched: "none" };
}

export function depositFiles({ company, role, files, yearMonth }) {
  const found = matchFolder(company);
  const folder = found.folder || company;
  const dir = join(CV_ROOT, folder);
  mkdirSync(dir, { recursive: true });

  const stamp = yearMonth || new Date().toISOString().slice(0, 7).replace("-", ".");
  const out = [];
  for (const f of files) {
    if (!existsSync(f.path)) fail(`File not found: ${f.path}`, "Generate it first with cv_build or letter_build.");
    const ext = f.path.split(".").pop();
    const label =
      f.kind === "cv" ? "CV" : f.kind === "letter" ? "Lettre de motivation" : f.kind === "jobspec" ? "job-spec" : "analyse";
    const prefix = f.kind === "cv" || f.kind === "letter" ? `${stamp} Benoit SIGWALD ${company} ${role}` : `${stamp} ${company} ${role}`;
    const dest = join(dir, `${prefix} ${label}.${ext}`);
    copyFileSync(f.path, dest);
    out.push(dest);
  }
  return { folder: dir, reusedExistingFolder: found.matched !== "none", match: found.matched, files: out };
}
