// End-to-end test over real HTTP MCP, against a server started by the caller.
//   BASE=http://127.0.0.1:8099 CV_MCP_TOKEN=testtoken node test/smoke.mjs
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const BASE = process.env.BASE || "http://127.0.0.1:8099";
const TOKEN = process.env.CV_MCP_TOKEN || "";

let pass = 0;
let fail = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  ok ? pass++ : fail++;
};

const JOB_SPEC = `AI Solution Architect (Lead). Design end-to-end technical architecture on AWS,
choosing optimal LLMs, orchestration, database and infrastructure stacks. Lead technical discovery
workshops and draft Architecture Design Documents for corporate stakeholders. Provide architectural
guidance to development squads. Evaluate third-party AI tools and cloud APIs for buy versus build.
Enterprise AI platform work: AI governance and guardrails, model lifecycle management, agent
orchestration. AWS. LLM orchestration. Architecture. Governance.`;

const health = await (await fetch(`${BASE}/health`)).json();
check("health is reachable without a token", health.ok === true, `soffice=${health.soffice}`);

const noAuth = await fetch(`${BASE}/mcp`, { method: "POST" });
check("MCP rejects a request with no token", noAuth.status === 401, `HTTP ${noAuth.status}`);

const client = new Client({ name: "remote-smoke", version: "1.0.0" });
await client.connect(
  new StreamableHTTPClientTransport(new URL(`${BASE}/mcp`), {
    requestInit: { headers: { Authorization: `Bearer ${TOKEN}` } },
  })
);

const { tools } = await client.listTools();
check("tools listed over HTTP", tools.length === 6, tools.map((t) => t.name).join(", "));

const call = async (name, args = {}) => {
  const r = await client.callTool({ name, arguments: args });
  return { text: r.content?.[0]?.text ?? "", data: r.structuredContent, isError: !!r.isError };
};

const kit = await call("cv_tailor_kit", { jobSpec: JOB_SPEC });
check("cv_tailor_kit returns the master CV", !kit.isError && !!kit.data.master?.identity, `master ${kit.data?.masterVersion}`);
check("cv_tailor_kit detects the language", kit.data?.language === "English", kit.data?.language);
check("cv_tailor_kit extracts keywords", kit.data?.keywords?.length > 5, `${kit.data?.keywords?.length} keywords`);
check("cv_tailor_kit ships the house rules", kit.data?.houseRules?.some((r) => r.includes("em-dash")), "");

const frenchKit = await call("cv_tailor_kit", {
  jobSpec: "Nous recherchons un architecte IA pour les equipes qui sont dans le hub, avec des competences sur les sujets que vous connaissez, pour des missions dans le conseil et aux clients du groupe.",
});
check("cv_tailor_kit detects French", frenchKit.data?.language === "French", frenchKit.data?.language);

const build = await call("cv_build", { data: kit.data.master, filename: "Smoke CV" });
check("cv_build renders one page", !build.isError && build.data.onePage, build.text.split("\n")[0]);
check("cv_build enforces the no-em-dash rule", build.data?.emDashCount === 0, `emDashCount=${build.data?.emDashCount}`);
check("cv_build returns two download links", build.data?.files?.length === 2, build.data?.files?.map((f) => f.name).join(", "));

const pdf = build.data.files.find((f) => f.name.endsWith(".pdf"));
const dl = await fetch(pdf.url, { headers: { Authorization: `Bearer ${TOKEN}` } });
const bytes = Buffer.from(await dl.arrayBuffer());
check("the PDF downloads over HTTP", dl.status === 200 && bytes.length > 20000, `${bytes.length} bytes`);
check("the download is a real PDF", bytes.subarray(0, 4).toString() === "%PDF", bytes.subarray(0, 4).toString());

const noTokenDl = await fetch(pdf.url);
check("downloads require the token", noTokenDl.status === 401, `HTTP ${noTokenDl.status}`);

const traversal = await fetch(`${BASE}/files/${build.data.bundleId}/..%2F..%2F..%2Fetc%2Fpasswd`, {
  headers: { Authorization: `Bearer ${TOKEN}` },
});
check("path traversal is refused", traversal.status === 404, `HTTP ${traversal.status}`);

const letter = await call("letter_build", { body: "Re: Smoke test\n\nA short body long enough to pass validation.\n\nBenoît SIGWALD" });
check("letter_build returns links", !letter.isError && letter.data.files.length === 2, letter.text.split("\n")[0]);

const ats = await call("ats_score", { jobSpec: JOB_SPEC, cvData: kit.data.master });
check("ats_score works", !ats.isError && ats.data.percent > 0, ats.text.split("\n")[0]);

const list = await call("application_list", { status: "interview" });
check("application_list reaches the database", !list.isError && list.data.count > 0, `${list.data?.count} interviews`);

const bad = await call("cv_build", { data: { identity: {} } });
check("cv_build errors actionably on bad data", bad.isError && bad.text.includes("How to fix"), "");

await client.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
