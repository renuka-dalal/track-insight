# Multi-stage build for production
FROM node:18-alpine AS base

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for migrations)
RUN npm ci

# Copy source code and migrations
COPY . .

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy node_modules and source from base
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package*.json ./
COPY --from=base /app/src ./src
COPY --from=base /app/migrations ./migrations

# Expose port (Render uses 10000)
EXPOSE 10000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:10000/api/stats', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Create startup script with migrations
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'set -e' >> /app/start.sh && \
    echo 'echo "Running database migrations..."' >> /app/start.sh && \
    echo 'npm run migrate:up' >> /app/start.sh && \
    echo 'echo "Seeding database with realistic data..."' >> /app/start.sh && \
    echo 'npm run db:seed:realistic' >> /app/start.sh && \
    echo 'echo "Starting server on port ${PORT:-10000}..."' >> /app/start.sh && \
    echo 'exec npm start' >> /app/start.sh && \
    chmod +x /app/start.sh

# Run startup script
CMD ["/app/start.sh"]
