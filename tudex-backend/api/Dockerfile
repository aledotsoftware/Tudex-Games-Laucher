FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src/ ./src/

RUN mkdir -p /app/uploads/games /app/uploads/launcher /app/uploads/icons /app/uploads/backgrounds

EXPOSE 3000

CMD ["node", "src/index.js"]
