FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY services/user-management/package*.json ./services/user-management/
COPY shared/common/package*.json ./shared/common/
COPY shared/database/package*.json ./shared/database/
COPY shared/types/package*.json ./shared/types/

RUN npm install

COPY services/user-management ./services/user-management
COPY shared ./shared
COPY tsconfig.json ./

WORKDIR /app/services/user-management
RUN npm run build

FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/services/user-management/dist ./dist
COPY --from=builder /app/services/user-management/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

ENV NODE_ENV=production

EXPOSE 3002

CMD ["node", "dist/main"]
