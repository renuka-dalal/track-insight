# Multi-stage build for production
FROM public.ecr.aws/docker/library/node:18-alpine AS base

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for migrations)
RUN npm ci

# Copy source code, migrations, scripts, and seeds
COPY . .

# Production stage
FROM public.ecr.aws/docker/library/node:18-alpine

WORKDIR /app

# Copy node_modules and source from base
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package*.json ./
COPY --from=base /app/src ./src
COPY --from=base /app/migrations ./migrations
COPY --from=base /app/scripts ./scripts
COPY --from=base /app/seeds ./seeds

# Copy startup script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Expose port (Render uses 10000)
EXPOSE 10000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:10000/api/stats', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Run startup script
CMD ["/app/start.sh"]
