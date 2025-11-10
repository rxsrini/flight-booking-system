FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY services/flight-search/package*.json ./services/flight-search/
COPY shared/common/package*.json ./shared/common/
COPY shared/database/package*.json ./shared/database/
COPY shared/types/package*.json ./shared/types/

RUN npm install

COPY services/flight-search ./services/flight-search
COPY shared ./shared
COPY tsconfig.json ./

WORKDIR /app/services/flight-search
RUN npm run build

FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/services/flight-search/dist ./dist
COPY --from=builder /app/services/flight-search/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

ENV NODE_ENV=production

EXPOSE 3003

CMD ["node", "dist/main"]
