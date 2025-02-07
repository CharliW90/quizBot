FROM node:current-slim AS builder

WORKDIR /discord_bot

COPY package*.json ./

RUN npm install --omit=dev

FROM node:current-slim AS runner

WORKDIR /discord_bot

COPY --from=builder /discord_bot/node_modules /discord_bot/node_modules  

COPY . .

CMD ["npm", "run", "deploy"]