# syntax=docker/dockerfile:1
# Build from the repository root: docker build -f apps/api/Dockerfile .
FROM node:20-alpine AS build
WORKDIR /repo
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/mobile/package.json apps/mobile/
COPY packages/shared/package.json packages/shared/
COPY packages/stellar/package.json packages/stellar/
COPY packages/error-codes/package.json packages/error-codes/
# postinstall builds the shared packages, so their sources must be present first
COPY tsconfig.base.json ./
COPY packages packages
COPY apps/api apps/api
RUN npm ci --ignore-scripts \
 && npm run build -w @qyou/error-codes -w @qyou/shared -w @qyou/stellar \
 && npx prisma generate --schema apps/api/prisma/schema.prisma \
 && npm run build -w @qyou/api

FROM node:20-alpine AS runtime
WORKDIR /repo
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY --from=build /repo /repo
USER node
EXPOSE 4000
# Apply pending migrations, then start the API.
CMD ["sh", "-c", "npx prisma migrate deploy --schema apps/api/prisma/schema.prisma && node apps/api/dist/server.js"]
