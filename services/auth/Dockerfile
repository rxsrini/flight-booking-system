FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY services/auth/package*.json ./services/auth/
COPY shared/common/package*.json ./shared/common/
COPY shared/database/package*.json ./shared/database/
COPY shared/types/package*.json ./shared/types/

RUN npm install

COPY services/auth ./services/auth
COPY shared ./shared
COPY tsconfig.json ./

WORKDIR /app/services/auth
RUN npm run build

FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/services/auth/dist ./dist
COPY --from=builder /app/services/auth/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "dist/main"]
