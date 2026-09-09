# cv-remote MCP server

The cv-optimizer pipeline over HTTP, callable from any MCP client: Claude, ChatGPT, Gemini,
or anything that speaks the protocol. Give it a job spec, get back a tailored CV and cover
letter as download links.

A remote caller shares no filesystem with this service, so every generated document is
stored under an unguessable id and served over the same origin.

## The flow

```
cv_tailor_kit(jobSpec)   ->  master CV + ranked keywords + language + house rules
        (the calling model writes the tailored version)
cv_build(data)           ->  DOCX + PDF links, page count, slack, em-dash count
letter_build(body)       ->  DOCX + PDF links
application_upsert(...)  ->  tracker row
```

`cv_tailor_kit` is the entry point. It hands the caller everything needed to tailor, then
`cv_build` reports whether the result actually fits on one page and what to cut if not.

## Tools

| Tool | Returns |
|---|---|
| `cv_tailor_kit` | Master CV data, keywords ranked by frequency, detected language, baseline coverage, house rules |
| `cv_build` | Download URLs, pages, `slackPt`, `emDashCount`, overflow text |
| `letter_build` | Download URLs, pages, `emDashCount` |
| `ats_score` | Coverage percentage, covered and missing keyword lists |
| `application_list` | Tracker rows ranked by ATS score |
| `application_upsert` | The inserted or updated row |

## Endpoints

| Path | Auth | Purpose |
|---|---|---|
| `POST /mcp` | Bearer | MCP, streamable HTTP, stateless |
| `GET /files/<id>/<name>` | Bearer | Download a generated document |
| `GET /health` | none | Liveness, and whether LibreOffice is present |

`/health` is deliberately unauthenticated: the orchestrator polls it and must not hold a
token.

## Environment

| Variable | Required | Notes |
|---|---|---|
| `CV_DB_URL` | yes | PostgREST base, e.g. `https://arx-mcp.duckdns.org/db-cv` |
| `CV_DB_KEY` | yes | Never committed; injected by the orchestrator |
| `CV_MCP_TOKEN` | yes | Bearer token callers must present. Without it the server runs open and says so on startup. |
| `PUBLIC_URL` | yes | External base, e.g. `https://arx-mcp.duckdns.org/cv`. Download links are built from it, so a mismatch produces links that 404. |
| `PORT` | no | Default 8080 |
| `DATA_DIR` | no | Default `/data/documents` |
| `FILE_TTL_DAYS` | no | Default 14. A sweep runs every six hours. |

## Deploy

Push to `main` triggers the Coolify build. The Dockerfile sits at the repository root
because the image reuses `scripts/` and `assets/`.

Coolify application settings:

- **Build pack** Dockerfile, **Dockerfile location** `Dockerfile`, **Base directory** `/`
- **Port** 8080, **Healthcheck path** `/health`
- **Memory limit** 1 GB. LibreOffice peaks around 400 MB during a conversion.
- **Persistent volume** `/data/documents` if you want links to survive a redeploy
- Declare every required variable above before the first deploy, or the container starts and
  fails on the first database call.

Generate the bearer token with:

```bash
openssl rand -hex 32
```

## Calling it

```jsonc
// Claude Code / Claude Desktop
{
  "mcpServers": {
    "cv-remote": {
      "type": "http",
      "url": "https://arx-mcp.duckdns.org/cv/mcp",
      "headers": { "Authorization": "Bearer <CV_MCP_TOKEN>" }
    }
  }
}
```

Other clients take the same URL and header. The transport is stateless, so there is no
session to keep alive and no sticky routing to configure.

## Test

Start it locally, then run the suite against it:

```bash
CV_MCP_TOKEN=testtoken PUBLIC_URL=http://127.0.0.1:8099 PORT=8099 \
  DATA_DIR=/tmp/cv-remote-data node index.mjs &
BASE=http://127.0.0.1:8099 CV_MCP_TOKEN=testtoken node test/smoke.mjs
```

Nineteen checks: real HTTP MCP session, a rendered one-page CV, a PDF downloaded and
verified by magic number, unauthenticated access refused, path traversal refused, and the
database reached.

## Font fidelity

The CV template uses Calibri. The image installs `fonts-crosextra-carlito`, which is
metric-compatible, so line breaks land where they do on Windows. Drop it and LibreOffice
substitutes something else, layout shifts, and the one-page check starts reporting a page
that nobody else sees.
