// DOCX to PDF conversion (LibreOffice) and one-page validation (PyMuPDF).
import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";
import { basename, dirname, join } from "node:path";
import { promisify } from "node:util";
import { fail } from "./env.mjs";

const run = promisify(execFile);

const SOFFICE_CANDIDATES = [
  process.env.SOFFICE_PATH,
  "C:/Program Files/LibreOffice/program/soffice.exe",
  "C:/Program Files (x86)/LibreOffice/program/soffice.exe",
  "/usr/bin/soffice",
  "/Applications/LibreOffice.app/Contents/MacOS/soffice",
].filter(Boolean);

export function findSoffice() {
  return SOFFICE_CANDIDATES.find((p) => existsSync(p)) || null;
}

// A4 is 842pt tall; the master template leaves ~15pt at the bottom.
export const PAGE_BOTTOM_PT = 826;

export async function docxToPdf(docxPath) {
  const soffice = findSoffice();
  if (!soffice) {
    fail(
      "LibreOffice was not found, so the DOCX cannot be converted to PDF.",
      "Install it with `winget install --id TheDocumentFoundation.LibreOffice -e`, " +
        "or set SOFFICE_PATH to the soffice executable. Everything else in this server still works; " +
        "only PDF rendering and page validation need it."
    );
  }
  const outDir = dirname(docxPath);
  const pdfPath = join(outDir, basename(docxPath).replace(/\.docx$/i, ".pdf"));
  try {
    await run(soffice, ["--headless", "--convert-to", "pdf", "--outdir", outDir, docxPath], {
      timeout: 120000,
    });
  } catch (e) {
    fail(
      `LibreOffice failed to convert ${basename(docxPath)}: ${e.message}`,
      "Close any open LibreOffice window and retry. A freshly installed LibreOffice sometimes needs one " +
        "manual launch before headless conversion works."
    );
  }
  if (!existsSync(pdfPath)) {
    fail(
      `LibreOffice reported success but produced no PDF for ${basename(docxPath)}.`,
      "Retry once; if it still fails, run the conversion manually to see the error."
    );
  }
  return pdfPath;
}

const PY_INSPECT = `
import sys, json, pymupdf
d = pymupdf.open(sys.argv[1])
blocks = [b for b in d[0].get_text("blocks") if b[4].strip()]
first = d[0].get_text()
out = {
  "pages": d.page_count,
  "bottomY": round(max(b[3] for b in blocks), 1) if blocks else 0.0,
  "emDashCount": sum(p.get_text().count("\u2014") for p in d),
  "overflowText": d[1].get_text()[:400].strip() if d.page_count > 1 else "",
}
print(json.dumps(out))
`;

// Windows ships `python`, Debian ships `python3`. Probe once, remember the winner.
let pythonBin = null;
async function python() {
  if (pythonBin) return pythonBin;
  for (const bin of [process.env.PYTHON_BIN, "python3", "python"].filter(Boolean)) {
    try {
      await run(bin, ["-c", "import pymupdf"], { timeout: 30000 });
      pythonBin = bin;
      return bin;
    } catch {
      // try the next candidate
    }
  }
  fail(
    "No Python with PyMuPDF was found, so page validation is unavailable.",
    "Install it with `pip install pymupdf`, or set PYTHON_BIN to an interpreter that has it."
  );
}

export async function inspectPdf(pdfPath) {
  let stdout;
  try {
    ({ stdout } = await run(await python(), ["-c", PY_INSPECT, pdfPath], { timeout: 60000 }));
  } catch (e) {
    fail(
      `Could not inspect ${basename(pdfPath)} with PyMuPDF: ${e.message}`,
      "Install it with `pip install pymupdf`. The PDF itself was produced and is on disk."
    );
  }
  const r = JSON.parse(stdout);
  return {
    ...r,
    slackPt: Math.round((PAGE_BOTTOM_PT - r.bottomY) * 10) / 10,
    onePage: r.pages === 1,
  };
}

// The text runs of a DOCX, read straight out of the zip via the central directory.
// Runs are returned separately because the two callers need different joins:
// ATS scoring must not glue "SIGWALD" and "AI" into one token, while the character
// count must match what the page actually renders.
export function docxRuns(docxPath) {
  const buf = readFileSync(docxPath);
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) fail(`${basename(docxPath)} is not a readable DOCX (no zip end record).`, "Regenerate the file with cv_build.");
  let off = buf.readUInt32LE(eocd + 16);
  const count = buf.readUInt16LE(eocd + 10);
  for (let i = 0; i < count; i++) {
    const nameLen = buf.readUInt16LE(off + 28);
    const extraLen = buf.readUInt16LE(off + 30);
    const commentLen = buf.readUInt16LE(off + 32);
    const name = buf.toString("utf8", off + 46, off + 46 + nameLen);
    if (name === "word/document.xml") {
      const method = buf.readUInt16LE(off + 10);
      const compSize = buf.readUInt32LE(off + 20);
      const local = buf.readUInt32LE(off + 42);
      const lNameLen = buf.readUInt16LE(local + 26);
      const lExtraLen = buf.readUInt16LE(local + 28);
      const start = local + 30 + lNameLen + lExtraLen;
      const raw = buf.subarray(start, start + compSize);
      const xml = (method === 0 ? raw : inflateRawSync(raw)).toString("utf8");
      return [...xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]);
    }
    off += 46 + nameLen + extraLen + commentLen;
  }
  fail(`${basename(docxPath)} contains no word/document.xml.`, "Regenerate the file with cv_build.");
}

export const docxText = (p) => docxRuns(p).join(" ");
export const docxCharCount = (p) => docxRuns(p).join("").length;
