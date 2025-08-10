FROM node:current-slim AS builder

WORKDIR /rebot

COPY package*.json ./

RUN npm install --omit=dev

FROM node:current-slim AS runner

WORKDIR /rebot

COPY --from=builder /rebot/node_modules /rebot/node_modules  

COPY . .

CMD ["npm", "run", "deploy"]