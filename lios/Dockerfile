# ── Build stage ──────────────────────────────────────────────────────
FROM node:20-slim AS builder

# Install native deps for node-canvas and sharp
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    pkg-config \
    python3 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy root workspace files
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/

# Install all deps
RUN npm ci

# Copy source
COPY packages/shared/ packages/shared/
COPY apps/api/ apps/api/
COPY tsconfig.base.json ./
COPY fonts/ fonts/

# Build shared package first, then API
RUN npm -w packages/shared run build
RUN npm -w apps/api run build

# ── Production stage ─────────────────────────────────────────────────
FROM node:20-slim

# Runtime deps for canvas and sharp
RUN apt-get update && apt-get install -y --no-install-recommends \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy entire workspace structure (npm workspaces hoists node_modules to root)
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/packages/shared/package.json packages/shared/
COPY --from=builder /app/packages/shared/dist/ packages/shared/dist/
COPY --from=builder /app/apps/api/package.json apps/api/
COPY --from=builder /app/apps/api/dist/ apps/api/dist/
COPY --from=builder /app/fonts/ fonts/
COPY --from=builder /app/node_modules/ node_modules/

ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "apps/api/dist/index.js"]
