FROM mcr.microsoft.com/playwright:v1.47.2-jammy

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx tsc

CMD ["node", "dist/index.js"]
