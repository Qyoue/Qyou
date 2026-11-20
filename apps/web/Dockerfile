# syntax=docker/dockerfile:1
# Build from the repository root: docker build -f apps/web/Dockerfile .
FROM node:20-alpine AS build
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/mobile/package.json apps/mobile/
COPY packages/shared/package.json packages/shared/
COPY packages/stellar/package.json packages/stellar/
COPY packages/error-codes/package.json packages/error-codes/
COPY tsconfig.base.json ./
COPY packages packages
COPY apps/web apps/web
# NEXT_PUBLIC_* values are inlined at build time, so they are build arguments.
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ARG NEXT_PUBLIC_STELLAR_NETWORK=TESTNET
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL NEXT_PUBLIC_STELLAR_NETWORK=$NEXT_PUBLIC_STELLAR_NETWORK
RUN npm ci --ignore-scripts \
 && npm run build -w @qyou/error-codes -w @qyou/shared -w @qyou/stellar \
 && npm run build -w @qyou/web

FROM node:20-alpine AS runtime
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo /repo
USER node
EXPOSE 3000
CMD ["npm", "run", "start", "-w", "@qyou/web"]
