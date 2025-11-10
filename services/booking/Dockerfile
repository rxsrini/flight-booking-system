FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY services/booking/package*.json ./services/booking/
COPY shared/common/package*.json ./shared/common/
COPY shared/database/package*.json ./shared/database/
COPY shared/types/package*.json ./shared/types/

RUN npm install

COPY services/booking ./services/booking
COPY shared ./shared
COPY tsconfig.json ./

WORKDIR /app/services/booking
RUN npm run build

FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/services/booking/dist ./dist
COPY --from=builder /app/services/booking/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

ENV NODE_ENV=production

EXPOSE 3004

CMD ["node", "dist/main"]
