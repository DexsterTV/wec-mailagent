FROM node:20-alpine

WORKDIR /app

# Instaluj zależności
COPY package*.json ./
RUN npm install --omit=dev

# Skopiuj kod aplikacji
COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
