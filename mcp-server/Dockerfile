
# docker build -t recall-kit-mcp:1.0.0 .
# docker save -o recall-kit-mcp.tar recall-kit-mcp:1.0.0
# docker load -i recall-kit-mcp.tar
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY ./src ./src
COPY ./tsconfig.json ./tsconfig.json

# 设置 npm 镜像为淘宝镜像
RUN npm config set registry https://registry.npmmirror.com

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/dist ./dist

EXPOSE 3001

ENV PORT=3001

CMD ["node", "dist/index.js"]
