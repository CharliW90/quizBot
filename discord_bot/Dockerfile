FROM node:22-slim AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

FROM node:22-slim AS runner

WORKDIR /app

COPY . .

CMD ["npm", "run", "deploy"]