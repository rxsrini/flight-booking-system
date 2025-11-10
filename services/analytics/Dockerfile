FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY services/analytics/package*.json ./services/analytics/
COPY shared/common/package*.json ./shared/common/
COPY shared/database/package*.json ./shared/database/
COPY shared/types/package*.json ./shared/types/

RUN npm install

COPY services/analytics ./services/analytics
COPY shared ./shared
COPY tsconfig.json ./

WORKDIR /app/services/analytics
RUN npm run build

FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/services/analytics/dist ./dist
COPY --from=builder /app/services/analytics/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

ENV NODE_ENV=production

EXPOSE 3006

CMD ["node", "dist/main"]
