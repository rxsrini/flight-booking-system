FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY services/audit/package*.json ./services/audit/
COPY shared/common/package*.json ./shared/common/
COPY shared/database/package*.json ./shared/database/
COPY shared/types/package*.json ./shared/types/

RUN npm install

COPY services/audit ./services/audit
COPY shared ./shared
COPY tsconfig.json ./

WORKDIR /app/services/audit
RUN npm run build

FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/services/audit/dist ./dist
COPY --from=builder /app/services/audit/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

ENV NODE_ENV=production

EXPOSE 3008

CMD ["node", "dist/main"]
