# BrowserAI Production Build

FROM node:22-bookworm

WORKDIR /app

# Install pnpm
RUN corepack enable pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# Copy all source files
COPY . .

# Install dependencies with frozen lockfile
RUN pnpm install --frozen-lockfile --strict-peer-dependencies=false && \
    echo "✓ pnpm install complete"

# Build all packages
RUN pnpm run --recursive build && \
    echo "✓ Build complete" && \
    ls -la packages/config/dist/ && \
    ls -la services/api/dist/

# Install Chromium dependencies for Playwright
RUN apt-get update && apt-get install -y \
  chromium-browser \
  ca-certificates \
  libssl3 \
  libfreetype6 \
  libharfbuzz0b \
  fonts-dejavu \
  && rm -rf /var/lib/apt/lists/*

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000), (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start API service
CMD ["node", "services/api/dist/main.js"]
