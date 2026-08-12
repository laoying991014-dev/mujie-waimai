# syntax=docker/dockerfile:1

# ---- 构建阶段 ----
FROM node:22-alpine AS builder

WORKDIR /app

# 安装依赖
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# 复制源码
COPY . .

# 构建后端 (NestJS)
RUN npm run build:server

# 构建前端 (React/Vite)
RUN npm run build:client

# ---- 运行阶段 ----
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    SERVER_HOST=0.0.0.0 \
    SERVER_PORT=3000 \
    FORCE_FRAMEWORK_DISABLE_DATAPASS=true

# 复制 package.json 用于安装生产依赖
COPY package.json package-lock.json* ./

# 安装生产依赖
RUN npm ci --omit=dev --no-audit --no-fund && \
    npm cache clean --force

# 复制构建产物（后端 + 前端）
COPY --from=builder /app/dist ./dist

# 创建静态资源目录（供 StaticModule 使用）
RUN mkdir -p shared/static

EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# 启动命令
CMD ["node", "dist/server/main.js"]
