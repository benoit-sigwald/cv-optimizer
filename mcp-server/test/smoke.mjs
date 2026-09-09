// End-to-end smoke test over a real stdio MCP session.
// Run: node test/smoke.mjs
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SERVER = resolve(HERE, "..", "index.mjs");
const MASTER = "G:/My Drive/CV/Master/master-cv-EN.json";

let pass = 0;
let fail = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  ok ? pass++ : fail++;
};

const client = new Client({ name: "smoke", version: "1.0.0" });
await client.connect(new StdioClientTransport({ command: "node", args: [SERVER] }));

const { tools } = await client.listTools();
check("tools listed", tools.length === 10, `${tools.length} tools: ${tools.map((t) => t.name).join(", ")}`);
check(
  "every tool has a description and annotations",
  tools.every((t) => t.description?.length > 40 && t.annotations),
  ""
);

const call = async (name, args = {}) => {
  const r = await client.callTool({ name, arguments: args });
  return { text: r.content?.[0]?.text ?? "", data: r.structuredContent, isError: !!r.isError };
};

const health = await call("pipeline_health");
check("pipeline_health", !health.isError && health.data.cvRootReadable, health.text.split("\n")[0]);

const cvData = JSON.parse(readFileSync(MASTER, "utf8"));

const predict = await call("cv_predict_overflow", { data: cvData });
check("cv_predict_overflow", !predict.isError && typeof predict.data.deltaPct === "number", predict.text);

const outDir = mkdtempSync(join(tmpdir(), "cv-smoke-"));
const build = await call("cv_build", { data: cvData, outDir, filename: "smoke.docx" });
check("cv_build renders one page", !build.isError && build.data.onePage, build.text.split("\n")[0]);
check("cv_build enforces the no-em-dash rule", build.data?.emDashCount === 0, `emDashCount=${build.data?.emDashCount}`);

const letter = await call("letter_build", { body: "Re: test\n\nShort body.\n\nBenoît SIGWALD", outDir });
check("letter_build", !letter.isError && letter.data.pages === 1, letter.text.split("\n")[0]);

const ats = await call("ats_score", {
  jobSpec: "Lead AI solution architect. AWS. LLM orchestration. AWS. LLM. Architecture design documents. Architecture. AWS.",
  cvDocx: build.data.docx,
  keywords: ["aws", "architect", "llm", "orchestration", "governance"],
});
check("ats_score reads a DOCX", !ats.isError && ats.data.percent >= 80, ats.text.split("\n")[0]);

const glued = await call("ats_score", { jobSpec: "x", cvDocx: build.data.docx, keywords: ["sigwald"] });
check("ats_score does not glue adjacent DOCX runs", glued.data.percent === 100, `${glued.data.percent}%`);

const falsePositive = await call("ats_score", {
  jobSpec: "irrelevant",
  cvData: { summary: "Leverage the platform" },
  keywords: ["rag"],
});
check("ats_score does not match RAG inside Leverage", falsePositive.data.percent === 0, `${falsePositive.data.percent}%`);

const list = await call("application_list", { status: "interview" });
check("application_list", !list.isError && list.data.count > 0, `${list.data?.count} interviews`);

const master = await call("master_cv_get");
check("master_cv_get", !master.isError && !!master.data.version, master.text);

const missing = await call("ats_score", { jobSpec: "anything" });
check("ats_score errors actionably with no CV", missing.isError && missing.text.includes("How to fix"), "");

const badDocx = await call("cv_build", { data: { identity: {} }, outDir });
check("cv_build errors actionably on bad data", badDocx.isError && badDocx.text.includes("How to fix"), "");

// Updating an existing row with its own values is idempotent, so this exercises
// the upsert path without leaving junk in cv_applications.
const team = (await call("application_list", {})).data.rows.find((r) => r.company === "TEAM International");
if (team) {
  const up = await call("application_upsert", { id: team.id, company: team.company, status: team.status });
  check("application_upsert updates in place", !up.isError && up.data.id === team.id, up.text);
}

await client.close();

// dossier_deposit is filesystem work, so it runs against a throwaway CV_ROOT.
const sandbox = mkdtempSync(join(tmpdir(), "cv-root-"));
const isolated = new Client({ name: "smoke-fs", version: "1.0.0" });
await isolated.connect(
  new StdioClientTransport({ command: "node", args: [SERVER], env: { ...process.env, CV_ROOT: sandbox } })
);
const dep = async (company) =>
  isolated.callTool({
    name: "dossier_deposit",
    arguments: {
      company,
      role: "Test Role",
      yearMonth: "2026.09",
      files: [{ path: build.data.docx, kind: "cv" }],
    },
  });

const first = await dep("Cap Gemini");
check("dossier_deposit creates a folder", !first.isError && first.structuredContent.reusedExistingFolder === false, "");
const second = await dep("capgemini");
check(
  "dossier_deposit reuses the folder despite spacing and case",
  second.structuredContent.reusedExistingFolder === true && second.structuredContent.folder === first.structuredContent.folder,
  second.structuredContent.folder
);
check(
  "dossier_deposit applies the naming convention",
  first.structuredContent.files[0].endsWith("2026.09 Benoit SIGWALD Cap Gemini Test Role CV.docx"),
  first.structuredContent.files[0].split(/[\\/]/).pop()
);
await isolated.close();

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
