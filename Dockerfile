# BrowserAI Multi-stage Production Build

FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# Copy workspace files and package.json files for all packages
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/*/package.json packages/
COPY services/*/package.json services/
COPY apps/*/package.json apps/

# Install dependencies with frozen lockfile
RUN pnpm install --frozen-lockfile --strict-peer-dependencies=false

# Copy source code
COPY . .

# Build all packages
RUN pnpm run --recursive build

# Runtime image
FROM node:22-alpine

WORKDIR /app

# Install pnpm
RUN corepack enable pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# Copy package files for dependency resolution
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/*/package.json packages/
COPY services/*/package.json services/
COPY apps/*/package.json apps/

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile --strict-peer-dependencies=false

# Copy built output from builder
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services ./services
COPY --from=builder /app/apps ./apps

# Install Chromium dependencies for Playwright
RUN apk add --no-cache \
  chromium \
  ca-certificates \
  nss \
  freetype \
  harfbuzz \
  ttf-dejavu

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000), (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start API service
CMD ["node", "services/api/dist/main.js"]
