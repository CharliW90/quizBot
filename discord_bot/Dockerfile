FROM node:22-slim AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

FROM node:22-slim AS runner

WORKDIR /app

COPY --from=builder /app/node_modules /app/node_modules  

COPY . .

CMD ["npm", "run", "deploy"]