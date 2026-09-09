#!/usr/bin/env node
// cv-pipeline MCP server.
//
// The split is deliberate: these tools own the mechanical steps (generate, render,
// measure, score, store, file). Judgement stays with the model calling them, which
// decides what the CV says, what is honest to claim, and what to cut when it overflows.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { z } from "zod";

import { CV_ROOT, ToolError, secrets } from "./lib/env.mjs";
import { cvDataToText, extractKeywords, score } from "./lib/ats.mjs";
import { docxCharCount, docxText, docxToPdf, findSoffice, inspectPdf } from "./lib/render.mjs";
import { generateCv, generateLetter } from "./lib/docgen.mjs";
import { depositFiles, matchFolder } from "./lib/files.mjs";
import {
  findApplication,
  getMaster,
  insertApplication,
  listApplications,
  patchApplication,
  setMaster,
} from "./lib/db.mjs";

const WORK = join(tmpdir(), "cv-pipeline-mcp");
mkdirSync(WORK, { recursive: true });

const outPath = (dir, name) => {
  const d = dir ? resolve(dir) : WORK;
  mkdirSync(d, { recursive: true });
  return join(d, name.endsWith(".docx") ? name : `${name}.docx`);
};

// Wraps a handler so ToolError surfaces as an actionable isError result
// rather than a protocol-level exception.
const tool = (fn) => async (args) => {
  try {
    const { text, data } = await fn(args);
    return { content: [{ type: "text", text }], ...(data ? { structuredContent: data } : {}) };
  } catch (e) {
    if (e instanceof ToolError) return { content: [{ type: "text", text: e.message }], isError: true };
    return { content: [{ type: "text", text: `Unexpected failure: ${e.message}` }], isError: true };
  }
};

const server = new McpServer({ name: "cv-pipeline", version: "1.0.0" });

// ---------------------------------------------------------------- build

const VALIDATION_OUT = {
  docx: z.string(),
  pdf: z.string(),
  pages: z.number(),
  onePage: z.boolean(),
  bottomY: z.number(),
  slackPt: z.number(),
  emDashCount: z.number(),
  charCount: z.number(),
  overflowText: z.string(),
};

server.registerTool(
  "cv_build",
  {
    title: "Build and validate a CV",
    description:
      "Generate the CV DOCX from a data object, render it to PDF, and report whether it fits on one page. " +
      "Returns pages, the Y position of the last text block, remaining slack in points, the em-dash count " +
      "(house rule: must be 0), the character count, and the text that spilled onto page 2 if any. " +
      "Use this instead of generating and checking separately: it collapses the trim-and-recheck loop into one call.",
    inputSchema: {
      data: z.record(z.any()).describe("CV data object: identity, summary, key_skills, recent_ai_projects, career, formation."),
      out: z.string().optional().describe("Output DOCX path. Defaults to a temp file."),
      outDir: z.string().optional().describe("Directory for the output, used when `out` is omitted."),
      filename: z.string().optional().describe("Filename when `out` is omitted. Defaults to cv.docx."),
      photo: z.string().optional().describe("Photo path. Defaults to the repo's assets/photo.jpg."),
    },
    outputSchema: VALIDATION_OUT,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  tool(async ({ data, out, outDir, filename, photo }) => {
    const docx = out ? resolve(out) : outPath(outDir, filename || "cv.docx");
    await generateCv({ data, photo, out: docx });
    const charCount = docxCharCount(docx);
    const pdf = await docxToPdf(docx);
    const v = await inspectPdf(pdf);
    const result = { docx, pdf, charCount, ...v };
    const verdict = v.onePage
      ? `Fits on one page with ${v.slackPt}pt to spare.`
      : `OVERFLOWS to ${v.pages} pages. Cut roughly ${Math.max(120, Math.round((v.bottomY - 826) * 6))} characters. Spilled text: ${v.overflowText.slice(0, 120)}`;
    const dash = v.emDashCount === 0 ? "No em-dashes." : `${v.emDashCount} em-dash(es) present, house rule requires 0.`;
    return { text: `${verdict}\n${dash}\n${charCount} characters.\nDOCX: ${docx}\nPDF: ${pdf}`, data: result };
  })
);

server.registerTool(
  "cv_predict_overflow",
  {
    title: "Predict page overflow before rendering",
    description:
      "Compare the text volume of a CV data object against a reference DOCX known to fit on one page. " +
      "Cheap and instant: no LibreOffice, no PDF. Use it while drafting, then confirm with cv_build.",
    inputSchema: {
      data: z.record(z.any()).describe("CV data object to measure."),
      referenceDocx: z
        .string()
        .optional()
        .describe("A DOCX known to fit one page. Defaults to the English master CV under CV_ROOT/Master."),
    },
    outputSchema: {
      charCount: z.number(),
      referenceChars: z.number(),
      deltaPct: z.number(),
      verdict: z.string(),
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  tool(async ({ data, referenceDocx }) => {
    const ref = referenceDocx || join(CV_ROOT, "Master", "2026.08 Benoit SIGWALD CV Master EN.docx");
    const referenceChars = docxCharCount(ref);
    // Rough proxy: the generator adds fixed chrome, so compare the free text only.
    const charCount = cvDataToText(data).length;
    const deltaPct = Math.round(((charCount - referenceChars) / referenceChars) * 1000) / 10;
    const verdict =
      deltaPct <= 2
        ? "Should fit on one page."
        : deltaPct <= 6
        ? "Borderline. Render it and check."
        : `Likely to overflow. Trim about ${Math.round((deltaPct - 2) * referenceChars / 100)} characters.`;
    return {
      text: `${charCount} characters against a reference of ${referenceChars} (${deltaPct > 0 ? "+" : ""}${deltaPct}%). ${verdict}`,
      data: { charCount, referenceChars, deltaPct, verdict },
    };
  })
);

server.registerTool(
  "letter_build",
  {
    title: "Build a cover letter",
    description:
      "Generate the cover letter DOCX from plain text, render it to PDF, and report page count and em-dash count.",
    inputSchema: {
      body: z.string().describe("Letter body as plain text, including the subject line and signature."),
      name: z.string().optional().describe("Name in the header band. Defaults to Benoît SIGWALD."),
      contact: z.string().optional().describe("Contact line in the header band."),
      out: z.string().optional(),
      outDir: z.string().optional(),
      filename: z.string().optional(),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  tool(async ({ body, name, contact, out, outDir, filename }) => {
    const docx = out ? resolve(out) : outPath(outDir, filename || "letter.docx");
    await generateLetter({
      body,
      name: name || "Benoît SIGWALD",
      contact:
        contact || "Mougins, France · +33 6 13 70 53 21 · benoit.p.g.sigwald@gmail.com · github.com/benoit-sigwald",
      out: docx,
    });
    const pdf = await docxToPdf(docx);
    const v = await inspectPdf(pdf);
    const dash = v.emDashCount === 0 ? "No em-dashes." : `${v.emDashCount} em-dash(es) present, house rule requires 0.`;
    return { text: `${v.pages} page(s). ${dash}\nDOCX: ${docx}\nPDF: ${pdf}`, data: { docx, pdf, ...v } };
  })
);

// ---------------------------------------------------------------- score

server.registerTool(
  "ats_score",
  {
    title: "Score a CV against a job spec",
    description:
      "Extract the ranked keywords from a job spec and report which ones the CV covers. " +
      "Matching is done on a token stream, so 'Leverage' never counts as a hit for 'RAG'. " +
      "Supply either cvData or cvDocx. The missing list is advisory: only add keywords the candidate can defend.",
    inputSchema: {
      jobSpec: z.string().describe("Full job description text."),
      cvData: z.record(z.any()).optional().describe("CV data object."),
      cvDocx: z.string().optional().describe("Path to a generated CV DOCX."),
      keywords: z.array(z.string()).optional().describe("Override the extracted keyword list."),
      limit: z.number().int().min(5).max(120).optional().describe("How many keywords to extract. Default 45."),
    },
    outputSchema: {
      percent: z.number(),
      coveredCount: z.number(),
      total: z.number(),
      covered: z.array(z.string()),
      missing: z.array(z.string()),
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  tool(async ({ jobSpec, cvData, cvDocx, keywords, limit }) => {
    if (!cvData && !cvDocx) {
      throw new ToolError("No CV supplied.\n\nHow to fix: pass cvData (the data object) or cvDocx (a path to a generated DOCX).");
    }
    const text = cvDocx ? docxText(resolve(cvDocx)) : cvDataToText(cvData);
    const kw = keywords?.length ? keywords : extractKeywords(jobSpec, limit || 45);
    const r = score(text, kw);
    return {
      text: `${r.percent}% coverage (${r.coveredCount}/${r.total}).\nMissing: ${r.missing.join(", ") || "none"}`,
      data: r,
    };
  })
);

// ---------------------------------------------------------------- track

server.registerTool(
  "application_list",
  {
    title: "List applications",
    description: "Read cv_applications, ranked by ATS score. Optionally filter by status (sent, interview, offer, rejected, draft).",
    inputSchema: {
      status: z.string().optional().describe("Filter on an exact status value."),
      limit: z.number().int().min(1).max(500).optional(),
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  tool(async ({ status, limit }) => {
    const rows = await listApplications(status, limit || 200);
    const lines = rows.map((r) => `${String(r.ats_score_after ?? "--").padStart(3)} | ${r.company} | ${r.role || ""} | ${r.status}`);
    return { text: `${rows.length} application(s).\n${lines.join("\n")}`, data: { count: rows.length, rows } };
  })
);

server.registerTool(
  "application_upsert",
  {
    title: "Create or update an application",
    description:
      "Insert a cv_applications row, or update the existing one when a company match is found. " +
      "Pass id to target a specific row. Company matching is fuzzy, so check the returned id.",
    inputSchema: {
      id: z.string().optional().describe("Row id to update. When omitted, an existing company match is updated, otherwise a row is inserted."),
      company: z.string().describe("Employer name."),
      role: z.string().optional(),
      location: z.string().optional(),
      status: z.string().optional().describe("sent, interview, offer, rejected, draft."),
      ats_score_after: z.number().int().min(0).max(100).optional(),
      salary_benchmark: z.string().optional(),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  },
  tool(async ({ id, company, ...rest }) => {
    const row = Object.fromEntries(Object.entries({ company, ...rest }).filter(([, v]) => v !== undefined));
    let target = id;
    if (!target) {
      const existing = await findApplication(company);
      if (existing.length === 1) target = existing[0].id;
      else if (existing.length > 1) {
        throw new ToolError(
          `"${company}" matches ${existing.length} rows: ${existing.map((e) => `${e.id} (${e.role})`).join(", ")}.` +
            "\n\nHow to fix: call again with the id of the row you mean."
        );
      }
    }
    const res = target ? await patchApplication(target, row) : await insertApplication(row);
    const r = res[0];
    return { text: `${target ? "Updated" : "Inserted"} ${r.company} (${r.id}), status ${r.status}, ATS ${r.ats_score_after ?? "--"}.`, data: r };
  })
);

server.registerTool(
  "master_cv_get",
  {
    title: "Read the master CV",
    description: "Return the current master CV record from cv_master: id, version and the full data object.",
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  tool(async () => {
    const rows = await getMaster();
    if (!rows.length) throw new ToolError("No current master CV found.\n\nHow to fix: check that a cv_master row has is_current = true.");
    const m = rows[0];
    return { text: `Master ${m.version}: ${m.content?.identity?.title || "(no title)"} (id ${m.id})`, data: m };
  })
);

server.registerTool(
  "master_cv_set",
  {
    title: "Replace the master CV",
    description: "Overwrite the current master CV content. This replaces the stored record, so read it first if you intend to merge.",
    inputSchema: {
      content: z.record(z.any()).describe("Full CV data object."),
      version: z.string().optional().describe("Version label, e.g. 2026.09."),
      id: z.string().optional().describe("Row id. Defaults to the current master."),
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
  },
  tool(async ({ content, version, id }) => {
    let target = id;
    if (!target) {
      const rows = await getMaster();
      if (!rows.length) throw new ToolError("No current master CV to update.\n\nHow to fix: pass an explicit id.");
      target = rows[0].id;
    }
    const res = await setMaster(target, content, version);
    return { text: `Master updated to ${res[0].version}: ${res[0].content?.identity?.title || ""}`, data: res[0] };
  })
);

// ---------------------------------------------------------------- file

server.registerTool(
  "dossier_deposit",
  {
    title: "File deliverables in the company folder",
    description:
      "Copy generated files into CV_ROOT/<Company>/ using the house naming convention. " +
      "Reuses an existing folder when one matches case- and space-insensitively, so 'Cap Gemini' never " +
      "creates a second folder next to 'Capgemini'. Reports which folder was used and whether it already existed.",
    inputSchema: {
      company: z.string(),
      role: z.string().describe("Job title, included in every filename so several roles can coexist."),
      yearMonth: z.string().optional().describe("Prefix such as 2026.09. Defaults to the current month."),
      files: z
        .array(
          z.object({
            path: z.string(),
            kind: z.enum(["cv", "letter", "jobspec", "analysis"]),
          })
        )
        .describe("Files to copy, each tagged with its kind."),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  tool(async (args) => {
    const r = depositFiles(args);
    const note = r.reusedExistingFolder ? `Reused existing folder (${r.match} match).` : "Created a new folder.";
    return { text: `${note}\n${r.folder}\n${r.files.map((f) => `  ${f.split(/[\\/]/).pop()}`).join("\n")}`, data: r };
  })
);

server.registerTool(
  "pipeline_health",
  {
    title: "Check the pipeline's dependencies",
    description:
      "Report whether LibreOffice, PyMuPDF, the candidature root and the database credentials are available. " +
      "Call this first when a build or tracking tool fails.",
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  tool(async () => {
    const soffice = findSoffice();
    const { url, key } = secrets();
    const folder = (() => {
      try {
        matchFolder("Master");
        return true;
      } catch {
        return false;
      }
    })();
    const lines = [
      `LibreOffice: ${soffice || "NOT FOUND — run: winget install --id TheDocumentFoundation.LibreOffice -e"}`,
      `Candidature root: ${CV_ROOT}${folder ? "" : " — NOT READABLE, set CV_ROOT"}`,
      `Database: ${url ? url : "no URL"}${key ? " (key loaded)" : " — NO KEY, tracking tools will fail"}`,
    ];
    return {
      text: lines.join("\n"),
      data: { soffice, cvRoot: CV_ROOT, cvRootReadable: folder, dbUrl: url, dbKeyPresent: !!key },
    };
  })
);

await server.connect(new StdioServerTransport());
