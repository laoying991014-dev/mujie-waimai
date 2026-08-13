# syntax=docker/dockerfile:1

# ---- 构建阶段 ----
FROM node:22-alpine AS builder
WORKDIR /app

# 安装依赖
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

# 复制源码
COPY . .

# 构建后端 (NestJS)
RUN npm run build:server

# 构建前端 (React/Vite)
RUN npm run build:client

# ---- 运行阶段 ----
FROM node:22-alpine AS runner
WORKDIR /app

# 安装 psql 客户端用于数据库初始化
RUN apk add --no-cache postgresql-client

ENV NODE_ENV=production \
    SERVER_HOST=0.0.0.0 \
    SERVER_PORT=3000 \
    FORCE_FRAMEWORK_DISABLE_DATAPASS=true \
    ENABLE_CSRF=false \
    DISABLE_CSRF=true \
    FORCE_FRAMEWORK_DISABLE_CSRF=true

# 复制 package.json 用于安装生产依赖
COPY package.json package-lock.json* ./

# 安装生产依赖
RUN npm install --omit=dev --no-audit --no-fund && \
    npm cache clean --force

# 复制构建产物（后端 + 前端）
COPY --from=builder /app/dist ./dist

# 复制 SQL 初始化脚本
COPY deploy/sql ./deploy/sql

# 复制启动脚本
COPY deploy/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# 创建静态资源目录
RUN mkdir -p shared/static

EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# 启动命令（先初始化数据库，再启动应用）
CMD ["./entrypoint.sh"]
