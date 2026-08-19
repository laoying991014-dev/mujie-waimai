# 木姐外卖

全栈外卖点餐系统，包含 C 端用户端、B 端商家端和管理后台三端。

## 技术栈

- 前端：React 19 + TypeScript + Vite + TailwindCSS
- 后端：NestJS 10 + TypeScript
- 数据库：PostgreSQL 16 + Drizzle ORM
- 认证：JWT + bcryptjs

## 快速开始

详见 [deploy/DEPLOY.md](deploy/DEPLOY.md)

### Docker Compose 一键启动

```bash
docker compose -f deploy/docker-compose.yml up -d --build
```

访问 http://localhost:3000

### 默认账号

| 端 | 账号 | 密码 |
|----|------|------|
| 管理后台 | admin | 000888 |
| C 端用户 | 13800138001 | 123456 |
| 商家端 | xiangwei / tiantian / xiancha | 123456 |

