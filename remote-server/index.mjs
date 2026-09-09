#!/usr/bin/env node
// cv-remote MCP server: HTTP transport, callable from any MCP client or LLM.
//
// Same split as the local server: these tools own the mechanical steps, the calling
// model owns the writing. The difference is that a remote caller shares no filesystem
// with this process, so every generated document comes back as a download URL.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";
import { z } from "zod";

import { ToolError } from "../mcp-server/lib/env.mjs";
import { cvDataToText, extractKeywords, score } from "../mcp-server/lib/ats.mjs";
import { docxCharCount, docxToPdf, findSoffice, inspectPdf } from "../mcp-server/lib/render.mjs";
import { generateCv, generateLetter } from "../mcp-server/lib/docgen.mjs";
import {
  findApplication,
  getMaster,
  insertApplication,
  listApplications,
  patchApplication,
} from "../mcp-server/lib/db.mjs";
import { DATA_DIR, locate, newBundle, publish, sweep } from "./lib/store.mjs";

const PORT = Number(process.env.PORT || 8080);
const TOKEN = process.env.CV_MCP_TOKEN || "";

const MIME = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

// House rules the calling model must respect. They are part of the contract, not decoration:
// an em-dash or a second page is a defect in this pipeline.
const HOUSE_RULES = [
  "Write the CV in the same language as the job spec.",
  "Never use an em-dash. It reads as machine-written.",
  "The CV must fit on exactly one page. cv_build reports the overflow so you can trim.",
  "Cover the job spec keywords, but do not mirror its phrasing. A CV that echoes the advert reads as fabricated.",
  "Never claim experience the master CV does not support. Adjacent patterns can be claimed as patterns, not as delivery.",
  "Keep every metric from the master CV. Numbers are the strongest part of this profile.",
];

const frenchness = (t) =>
  (t.toLowerCase().match(/\b(les|des|une|vous|nous|pour|dans|avec|sur|est|sont|qui|que|au|aux|du)\b/g) || []).length;

const tool = (fn) => async (args) => {
  try {
    const { text, data } = await fn(args);
    return { content: [{ type: "text", text }], ...(data ? { structuredContent: data } : {}) };
  } catch (e) {
    if (e instanceof ToolError) return { content: [{ type: "text", text: e.message }], isError: true };
    return { content: [{ type: "text", text: `Unexpected failure: ${e.message}` }], isError: true };
  }
};

function buildServer() {
  const server = new McpServer({ name: "cv-remote", version: "1.0.0" });

  server.registerTool(
    "cv_tailor_kit",
    {
      title: "Start here: everything needed to tailor a CV to a job spec",
      description:
        "Give this tool a job spec and it returns the master CV data, the ranked keywords extracted from the " +
        "spec, the language to write in, and the house rules. Fill in the returned CV shape with tailored " +
        "content, then call cv_build. This is the entry point of the pipeline.",
      inputSchema: {
        jobSpec: z.string().min(40).describe("The full job description text."),
        keywordLimit: z.number().int().min(10).max(120).optional(),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    tool(async ({ jobSpec, keywordLimit }) => {
      const rows = await getMaster();
      if (!rows.length) throw new ToolError("No master CV is stored.\n\nHow to fix: seed a cv_master row with is_current = true.");
      const master = rows[0];
      const keywords = extractKeywords(jobSpec, keywordLimit || 45);
      const language = frenchness(jobSpec) >= 6 ? "French" : "English";
      const baseline = score(cvDataToText(master.content), keywords);
      const data = { master: master.content, masterVersion: master.version, language, keywords, baselineCoverage: baseline.percent, houseRules: HOUSE_RULES };
      return {
        text:
          `Master CV ${master.version} returned. Write in ${language}.\n` +
          `Untailored coverage of this spec: ${baseline.percent}%.\n` +
          `Keywords: ${keywords.join(", ")}\n\n` +
          `House rules:\n${HOUSE_RULES.map((r) => `- ${r}`).join("\n")}\n\n` +
          `Next: send your tailored version of the master object to cv_build.`,
        data,
      };
    })
  );

  server.registerTool(
    "cv_build",
    {
      title: "Build and validate a CV, returning download links",
      description:
        "Generate the CV DOCX from a data object, render it to PDF, validate it, and return download URLs. " +
        "Reports pages, remaining slack in points, em-dash count (must be 0) and any text that spilled onto " +
        "page 2, so you can trim and rebuild.",
      inputSchema: {
        data: z.record(z.any()).describe("Tailored CV data, same shape as the master returned by cv_tailor_kit."),
        filename: z.string().optional().describe("Base filename, e.g. 'Acme AI Architect CV'."),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    tool(async ({ data, filename }) => {
      const bundle = newBundle();
      const base = (filename || "CV").replace(/\.docx$/i, "");
      const docx = join(bundle.dir, `${base}.docx`);
      await generateCv({ data, out: docx });
      const charCount = docxCharCount(docx);
      const pdf = await docxToPdf(docx);
      const v = await inspectPdf(pdf);
      const files = [publish(bundle, docx), publish(bundle, pdf)];
      const verdict = v.onePage
        ? `Fits on one page with ${v.slackPt}pt to spare.`
        : `OVERFLOWS to ${v.pages} pages. Cut roughly ${Math.max(120, Math.round((v.bottomY - 826) * 6))} characters, then rebuild. Spilled: ${v.overflowText.slice(0, 150)}`;
      const dash = v.emDashCount === 0 ? "No em-dashes." : `${v.emDashCount} em-dash(es), house rule requires 0.`;
      return {
        text: `${verdict}\n${dash}\n${charCount} characters.\n${files.map((f) => `${f.name}: ${f.url}`).join("\n")}`,
        data: { bundleId: bundle.id, files, charCount, ...v },
      };
    })
  );

  server.registerTool(
    "letter_build",
    {
      title: "Build a cover letter, returning download links",
      description: "Generate the cover letter DOCX and PDF from plain text and return download URLs.",
      inputSchema: {
        body: z.string().min(50).describe("Letter body as plain text, including subject line and signature."),
        name: z.string().optional(),
        contact: z.string().optional(),
        filename: z.string().optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    tool(async ({ body, name, contact, filename }) => {
      const bundle = newBundle();
      const base = (filename || "Cover letter").replace(/\.docx$/i, "");
      const docx = join(bundle.dir, `${base}.docx`);
      await generateLetter({
        body,
        name: name || "Benoît SIGWALD",
        contact: contact || "Mougins, France · +33 6 13 70 53 21 · benoit.p.g.sigwald@gmail.com · github.com/benoit-sigwald",
        out: docx,
      });
      const pdf = await docxToPdf(docx);
      const v = await inspectPdf(pdf);
      const files = [publish(bundle, docx), publish(bundle, pdf)];
      const dash = v.emDashCount === 0 ? "No em-dashes." : `${v.emDashCount} em-dash(es), house rule requires 0.`;
      return {
        text: `${v.pages} page(s). ${dash}\n${files.map((f) => `${f.name}: ${f.url}`).join("\n")}`,
        data: { bundleId: bundle.id, files, ...v },
      };
    })
  );

  server.registerTool(
    "ats_score",
    {
      title: "Score a CV against a job spec",
      description:
        "Report which of the job spec's keywords the CV covers. Matching runs on a token stream, so 'Leverage' " +
        "never counts as a hit for 'RAG'. The missing list is advisory: only add what the candidate can defend.",
      inputSchema: {
        jobSpec: z.string(),
        cvData: z.record(z.any()).describe("CV data object to score."),
        keywords: z.array(z.string()).optional(),
        limit: z.number().int().min(5).max(120).optional(),
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
    tool(async ({ jobSpec, cvData, keywords, limit }) => {
      const kw = keywords?.length ? keywords : extractKeywords(jobSpec, limit || 45);
      const r = score(cvDataToText(cvData), kw);
      return { text: `${r.percent}% coverage (${r.coveredCount}/${r.total}).\nMissing: ${r.missing.join(", ") || "none"}`, data: r };
    })
  );

  server.registerTool(
    "application_list",
    {
      title: "List applications",
      description: "Read the application tracker, ranked by ATS score. Optionally filter by status.",
      inputSchema: { status: z.string().optional(), limit: z.number().int().min(1).max(500).optional() },
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
      description: "Insert a tracker row, or update the existing one when a single company match is found.",
      inputSchema: {
        id: z.string().optional(),
        company: z.string(),
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
      const r = (target ? await patchApplication(target, row) : await insertApplication(row))[0];
      return { text: `${target ? "Updated" : "Inserted"} ${r.company} (${r.id}), status ${r.status}, ATS ${r.ats_score_after ?? "--"}.`, data: r };
    })
  );

  return server;
}

// ---------------------------------------------------------------- http

const unauthorized = (res) => {
  res.writeHead(401, { "Content-Type": "application/json", "WWW-Authenticate": "Bearer" });
  res.end(JSON.stringify({ error: "Missing or invalid bearer token." }));
};

const http = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");

  // Unauthenticated on purpose: Coolify polls this and must not hold a token.
  if (url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ ok: true, soffice: !!findSoffice(), dataDir: DATA_DIR }));
  }

  const bearer = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (TOKEN && bearer !== TOKEN) return unauthorized(res);

  // Documents are served from the same origin so a caller can hand the link straight on.
  const file = url.pathname.match(/^\/files\/([0-9a-f]{24})\/(.+)$/);
  if (file && req.method === "GET") {
    const path = locate(file[1], decodeURIComponent(file[2]));
    if (!path) {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Not found or expired." }));
    }
    const ext = path.slice(path.lastIndexOf("."));
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Content-Length": statSync(path).size,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(path.split(/[\\/]/).pop())}"`,
    });
    return createReadStream(path).pipe(res);
  }

  if (url.pathname === "/mcp" || url.pathname === "/") {
    // Stateless: a fresh server and transport per request, so nothing is shared between callers.
    const server = buildServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on("close", () => {
      transport.close();
      server.close();
    });
    await server.connect(transport);
    return transport.handleRequest(req, res);
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Unknown path. MCP is at /mcp, health at /health." }));
});

setInterval(() => sweep(), 6 * 3600 * 1000).unref();

http.listen(PORT, () => {
  const auth = TOKEN ? "bearer token required" : "OPEN, set CV_MCP_TOKEN";
  console.log(`cv-remote MCP on :${PORT} (${auth}), documents in ${DATA_DIR}`);
});
