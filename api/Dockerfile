# syntax=docker/dockerfile:1.6
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=optional || npm install

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app
COPY --from=deps  --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/dist          ./dist
COPY --chown=app:app package.json migrations         ./
USER app
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8080/v1/health || exit 1
CMD ["node", "dist/server.js"]
