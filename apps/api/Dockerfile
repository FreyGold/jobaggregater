FROM node:20-alpine AS builder
# Enable pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app
COPY . .

# Install dependencies using cache
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Build the API and its dependencies (shared package)
RUN pnpm --filter @jobagg/api... build

# Deploy the @jobagg/api package to a separate directory with only its production dependencies
RUN pnpm deploy --filter @jobagg/api --prod /prod/api

FROM node:20-alpine AS runner
WORKDIR /app

# Copy the deployed application from the builder
COPY --from=builder /prod/api .

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "dist/server.js"]
