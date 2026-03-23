FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY src/ ./src/

# Crea los directorios de uploads
RUN mkdir -p /app/uploads/games /app/uploads/launcher /app/uploads/icons /app/uploads/backgrounds

EXPOSE 3000

CMD ["node", "src/index.js"]
