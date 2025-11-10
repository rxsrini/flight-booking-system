FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY services/notification/package*.json ./services/notification/
COPY shared/common/package*.json ./shared/common/
COPY shared/types/package*.json ./shared/types/

RUN npm install

COPY services/notification ./services/notification
COPY shared ./shared
COPY tsconfig.json ./

WORKDIR /app/services/notification
RUN npm run build

FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/services/notification/dist ./dist
COPY --from=builder /app/services/notification/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

ENV NODE_ENV=production

EXPOSE 3007

CMD ["node", "dist/main"]
