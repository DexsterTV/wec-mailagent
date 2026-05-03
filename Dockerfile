FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

FROM node:20-alpine AS backend-deps

WORKDIR /app

COPY deploy/package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=backend-deps /app/node_modules ./node_modules
COPY deploy/package*.json ./
COPY deploy/server.js ./
COPY deploy/routes ./routes
RUN mkdir -p /app/data
COPY deploy/.env.example ./.env.example
COPY --from=frontend-builder /app/deploy/dist-frontend ./dist-frontend

EXPOSE 3000

CMD ["node", "server.js"]
