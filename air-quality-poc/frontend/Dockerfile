# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./

# Use a cache mount for npm and increase network resilience
RUN --mount=type=cache,target=/root/.npm \
    npm ci \
    --loglevel=info \
    --fetch-retries=5 \
    --fetch-retry-mintimeout=20000 \
    --maxsockets=50

# Copy source and build
COPY . .
ARG NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL
RUN npm run build

# Stage 2: Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production

# Copy necessary files from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/next.config.js ./

EXPOSE 3000
CMD ["npm", "start"]
