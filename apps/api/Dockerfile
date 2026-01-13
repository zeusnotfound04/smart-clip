# Stage 1: Base image with dependencies
FROM node:20-alpine AS base

# Install system dependencies for video processing
RUN apk add --no-cache \
    ffmpeg \
    python3 \
    py3-pip \
    && pip3 install --no-cache-dir --break-system-packages yt-dlp

# Stage 2: Dependencies
FROM base AS deps
WORKDIR /app

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy all workspace package.json files
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/docs/package.json ./apps/docs/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/ui/package.json ./packages/ui/

# Install pnpm and dependencies
RUN npm install -g pnpm@9.0.0
RUN pnpm install --frozen-lockfile

# Stage 3: Builder
FROM base AS builder
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9.0.0

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

# Copy source code
COPY turbo.json ./
COPY apps/api ./apps/api
COPY packages ./packages

# Generate Prisma client
WORKDIR /app/apps/api
RUN npx prisma generate

# Build the application
RUN npm run build

# Stage 4: Production runner
FROM base AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 apiuser

# Copy necessary files from builder
COPY --from=builder --chown=apiuser:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=apiuser:nodejs /app/apps/api/package.json ./
COPY --from=builder --chown=apiuser:nodejs /app/apps/api/node_modules ./node_modules
COPY --from=builder --chown=apiuser:nodejs /app/apps/api/prisma ./prisma
COPY --from=builder --chown=apiuser:nodejs /app/apps/api/fonts ./fonts

# Create temp directory for video processing
RUN mkdir -p /app/temp && chown -R apiuser:nodejs /app/temp

# Switch to non-root user
USER apiuser

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "dist/index.js"]
