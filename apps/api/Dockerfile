# syntax=docker/dockerfile:1

FROM node:22.17.0-bookworm-slim AS build
WORKDIR /repo
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @littlearc/api run typecheck
RUN pnpm --filter @littlearc/api --prod deploy --legacy /out

FROM node:22.17.0-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /out .
EXPOSE 3000
CMD ["node", "node_modules/tsx/dist/cli.mjs", "src/server.ts"]