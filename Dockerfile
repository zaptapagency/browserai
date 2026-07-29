# BrowserAI Multi-stage Production Build

FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# Copy all source files
COPY . .

# Install dependencies with frozen lockfile
RUN pnpm install --frozen-lockfile --strict-peer-dependencies=false

# Build all packages
RUN pnpm run --recursive build

# Runtime image
FROM node:22-alpine

WORKDIR /app

# Install pnpm
RUN corepack enable pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# Copy node_modules from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.pnpm-store ./.pnpm-store

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
