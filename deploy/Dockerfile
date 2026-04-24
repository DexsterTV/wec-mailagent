FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY server.js ./
COPY routes ./routes
COPY dist-frontend ./dist-frontend
COPY data ./data
COPY .env.example ./.env.example

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server.js"]
