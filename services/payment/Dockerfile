FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY services/payment/package*.json ./services/payment/
COPY shared/common/package*.json ./shared/common/
COPY shared/database/package*.json ./shared/database/
COPY shared/types/package*.json ./shared/types/

RUN npm install

COPY services/payment ./services/payment
COPY shared ./shared
COPY tsconfig.json ./

WORKDIR /app/services/payment
RUN npm run build

FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/services/payment/dist ./dist
COPY --from=builder /app/services/payment/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

ENV NODE_ENV=production

EXPOSE 3005

CMD ["node", "dist/main"]
