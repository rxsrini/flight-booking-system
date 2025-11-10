FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY services/api-gateway/package*.json ./services/api-gateway/

RUN npm install

COPY services/api-gateway ./services/api-gateway
COPY tsconfig.json ./

WORKDIR /app/services/api-gateway
RUN npm run build

FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/services/api-gateway/dist ./dist
COPY --from=builder /app/services/api-gateway/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/main"]
