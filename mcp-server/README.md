# cv-pipeline MCP server

Exposes the cv-optimizer pipeline as MCP tools: CV and letter generation, one-page PDF
validation, ATS scoring, application tracking and dossier filing.

The split is deliberate. These tools own the mechanical steps. Judgement stays with the
model calling them: what the CV says, which keywords are honest to claim, and what to cut
when a page overflows.

## Tools

| Tool | Does | Writes |
|---|---|---|
| `cv_build` | Generate DOCX, render PDF, report pages, slack, em-dash count, overflow text | files |
| `cv_predict_overflow` | Compare text volume against a reference that fits one page, no rendering | no |
| `letter_build` | Generate the cover letter DOCX and PDF | files |
| `ats_score` | Keyword coverage of a CV against a job spec | no |
| `application_list` | Read `cv_applications`, ranked by ATS score | no |
| `application_upsert` | Insert or update an application row | database |
| `master_cv_get` | Read the current master CV | no |
| `master_cv_set` | Replace the master CV content | database |
| `dossier_deposit` | Copy deliverables into `CV_ROOT/<Company>/` with the house naming convention | files |
| `pipeline_health` | Report whether LibreOffice, PyMuPDF, `CV_ROOT` and credentials are available | no |

## Three rules the server enforces mechanically

1. **One page.** `cv_build` returns `onePage`, `slackPt` and the text that spilled onto
   page 2. The generate, render, measure, trim loop becomes a single call.
2. **No em-dashes.** `emDashCount` is reported on every build. The house rule is 0.
3. **No duplicate company folders.** `dossier_deposit` matches case- and
   space-insensitively, so `Cap Gemini` files into the existing `Capgemini` folder.

## Requirements

- Node 20+
- LibreOffice, for DOCX to PDF. `winget install --id TheDocumentFoundation.LibreOffice -e`
- Python with PyMuPDF, for page measurement. `pip install pymupdf`
- `CV_ROOT/.env` holding `CV_DB_URL` and `CV_DB_KEY` for the tracking tools

Only the tracking tools need credentials, and only `cv_build`, `letter_build` need
LibreOffice. `pipeline_health` reports what is missing.

The service key is read from the environment or `CV_ROOT/.env` and never appears in a tool
argument or a tool result. The `.env` file wins over the ambient environment on purpose: a
stale `SUPABASE_URL` pointing at the decommissioned Supabase project still lingers in some
shells on this machine, and it would otherwise shadow the real endpoint.

The legacy names `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` still resolve as a fallback,
so anything deployed with them keeps working until its configuration is renamed.

## Install

```bash
cd mcp-server && npm install
```

Register it with any MCP client. For Claude Code, `G:/My Drive/CV/.mcp.json`:

```json
{
  "mcpServers": {
    "cv-pipeline": {
      "command": "node",
      "args": ["C:/Users/benoi/dev/cv-optimizer/mcp-server/index.mjs"],
      "env": { "CV_ROOT": "G:/My Drive/CV" }
    }
  }
}
```

## Test

```bash
node test/smoke.mjs
```

Runs a real stdio MCP session against the live master CV and database. It renders a CV and
a letter, checks the one-page and em-dash rules, verifies that `RAG` is not matched inside
`Leverage` and that adjacent DOCX runs are not glued into one token, exercises the upsert
path idempotently, and files a dossier into a throwaway `CV_ROOT`.

## Notes on the implementation

Plain ESM JavaScript with Zod rather than TypeScript. The repository has no build step, and
for a locally run server the safety that matters is Zod's runtime validation of tool inputs,
which is present either way.

DOCX layout is not reimplemented here. The tools shell out to `scripts/generate-cv.mjs` and
`scripts/generate-letter.mjs` so the document format keeps a single source of truth.
