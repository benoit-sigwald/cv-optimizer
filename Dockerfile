# Remote MCP server for the cv-optimizer pipeline.
# Build context is the repository root: the service reuses scripts/ and assets/ so the
# DOCX layout keeps a single source of truth.
#
# Targets arm64 (the deployment host is an Ampere A1). node:22-bookworm-slim publishes
# linux/arm64, and every apt package below has an arm64 build.
FROM node:22-bookworm-slim

# libreoffice-writer converts DOCX to PDF. python3-pymupdf measures the result.
# fonts-crosextra-carlito is metric-compatible with Calibri, which the CV template uses:
# without it LibreOffice substitutes a different font and the one-page check becomes a lie.
RUN apt-get update && apt-get install -y --no-install-recommends \
      libreoffice-writer \
      python3-pymupdf \
      fonts-crosextra-carlito \
      fonts-liberation \
      ca-certificates \
    && fc-cache -f \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dependencies first so a code change does not reinstall them.
# Root deps cover the generator scripts (docx); remote-server covers the MCP SDK.
# mcp-server/lib needs no dependencies of its own, only Node builtins, so it is copied bare.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY remote-server/package.json remote-server/package-lock.json ./remote-server/
RUN cd remote-server && npm ci --omit=dev

COPY scripts ./scripts
COPY assets ./assets
COPY mcp-server/lib ./mcp-server/lib
COPY remote-server ./remote-server

ENV NODE_ENV=production \
    PORT=8080 \
    DATA_DIR=/data/documents \
    PYTHON_BIN=python3 \
    SOFFICE_PATH=/usr/bin/soffice

# Generated documents live here. Mount a volume to keep them across redeploys;
# without one they are simply rebuilt on demand.
VOLUME ["/data/documents"]
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "remote-server/index.mjs"]
