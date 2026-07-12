# cv-optimizer

A **Claude Code project** that industrialises job applications: paste a job spec, get a tailored one-page CV (pixel-faithful DOCX) and a sharp cover letter, with ATS keyword scoring before/after.

No app, no server, no tokens burned on infrastructure — the intelligence is Claude Code itself, driven by skills. Personal data (master CV, photo, application history) lives in a private Supabase database, never in this repo.

## How it works

```
job spec ──▶ /analyze-offer ──▶ keywords, hard gates, language, company analysis
                    │
                    ▼
             /tailor-cv ──▶ gap analysis vs master CV ──▶ tailored DOCX (one A4, exact template)
                    │
                    ▼
             /cover-letter ──▶ provocative opener, job-spec language
                    │
                    ▼
             /ats-score ──▶ before/after score, keyword → section mapping
```

## Skills

| Skill | What it does |
|---|---|
| `/apply` | **Full pipeline** — runs the four skills below in sequence from a single pasted job spec; only stops if a blocking hard gate is detected |
| `/analyze-offer` | Extracts ATS keywords, hard gates (certifications, clearances), detects language, researches the company, recommends positioning |
| `/tailor-cv` | Maps master CV + skills bank against requirements, rewrites bullets with quantified metrics, generates DOCX via `docx` npm |
| `/cover-letter` | Writes a challenging, no-clichés cover letter in the job spec's language |
| `/ats-score` | Scores CV vs job spec, explicit keyword-to-section mapping |

## Architecture choices

- **Claude Code as the engine** — no LLM API calls in the code, no MCP server to host. Skills encode the methodology; Claude executes it.
- **Supabase as private memory** — master CV (structured JSONB), skills bank with evidence & metrics, application history, carried-forward constraints. RLS enabled, no public policies.
- **Deterministic DOCX generation** — `scripts/generate-cv.mjs` reproduces the master template exactly (header, 3-column skills grid, two-column career table) with the `docx` library. One A4, validated by rendering the first page.

## Setup

```bash
npm install
# drop your photo in assets/photo.jpg (gitignored)
# connect the Supabase MCP in Claude Code
claude
```

## License

MIT — the code, not the CV.
