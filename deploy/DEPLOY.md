# 木姐外卖 - 部署指南

> 木姐外卖是一套完整的外卖点餐系统，包含 C 端用户端、B 端商家端和管理后台三端，基于 NestJS + React + PostgreSQL + Drizzle ORM 构建。

## 技术栈

- **前端**: React 19 + TypeScript + Vite + TailwindCSS
- **后端**: NestJS 10 + TypeScript
- **数据库**: PostgreSQL 16
- **ORM**: Drizzle ORM
- **认证**: JWT (bcrypt 密码加密)
- **部署**: Docker / Render

---

## 目录结构

```
.
├── client/                 # 前端 React 应用
├── server/                 # 后端 NestJS 应用
├── shared/                 # 前后端共享类型
├── deploy/                 # 部署配置（本目录）
│   ├── sql/
│   │   ├── 01_schema.sql   # 数据库建表脚本
│   │   ├── 02_seed_data.sql   # 商品/商家等核心种子数据
│   │   └── 03_seed_extra.sql  # 管理员/用户/公告等扩展种子
│   ├── Dockerfile          # 后端服务 Docker 镜像
│   ├── docker-compose.yml  # 本地一键启动（后端 + PostgreSQL）
│   ├── render.yaml         # Render 一键部署配置
│   └── .env.example        # 环境变量示例
└── DEPLOY.md               # 本文档
```

---

## 一、本地启动（Docker Compose）

### 前置要求

- Docker 20+
- Docker Compose v2+

### 启动步骤

1. **克隆项目**

   ```bash
   git clone <repository-url>
   cd mujie-waimai
   ```

2. **一键启动**

   ```bash
   docker compose -f deploy/docker-compose.yml up -d --build
   ```

   启动后会自动完成：
   - 构建应用 Docker 镜像
   - 启动 PostgreSQL 数据库
   - 自动执行建表脚本和种子数据
   - 启动应用服务

3. **访问应用**

   | 端 | 地址 | 说明 |
   |----|------|------|
   | C 端用户端 | http://localhost:3000 | 移动端优先，首页浏览/点餐 |
   | 商家端 | http://localhost:3000/merchant/login | 商家管理后台 |
   | 管理后台 | http://localhost:3000/admin/login | 平台管理后台 |

4. **查看日志**

   ```bash
   docker compose -f deploy/docker-compose.yml logs -f app
   ```

5. **停止服务**

   ```bash
   docker compose -f deploy/docker-compose.yml down
   # 保留数据库数据
   ```

   ```bash
   docker compose -f deploy/docker-compose.yml down -v
   # 删除数据库数据（重新初始化）
   ```

---

## 二、部署到 Render

Render 是一个支持一键部署的 PaaS 平台，支持 PostgreSQL 托管和 Docker 部署。

### 步骤

1. **准备代码仓库**

   将项目代码推送到 GitHub / GitLab 仓库。

2. **修改 render.yaml**

   编辑 `deploy/render.yaml`，将 `repo` 字段改为你的实际仓库地址：

   ```yaml
   repo: https://github.com/your-org/mujie-waimai
   ```

3. **在 Render 上创建 Blueprint**

   1. 登录 [Render 控制台](https://dashboard.render.com)
   2. 点击 **New +** → **Blueprint**
   3. 选择你的代码仓库
   4. Render 会自动读取 `deploy/render.yaml`，预览服务列表
   5. 点击 **Apply** 开始部署

   部署完成后 Render 会输出服务访问地址。

4. **初始化数据库**

   首次部署后需要手动执行数据库初始化脚本：

   ```bash
   # 通过 Render Shell 或 psql 连接数据库
   psql $DATABASE_URL -f deploy/sql/01_schema.sql
   psql $DATABASE_URL -f deploy/sql/02_seed_data.sql
   psql $DATABASE_URL -f deploy/sql/03_seed_extra.sql
   ```

   也可以在 Render 后台的数据库 Shell 中依次执行以上 SQL 文件内容。

---

## 三、环境变量说明

所有环境变量可以在 `.env` 文件中配置，或通过部署平台的环境变量面板设置。

| 变量名 | 说明 | 默认值 | 必选 |
|--------|------|--------|------|
| `NODE_ENV` | 运行环境 | `production` | 是 |
| `SERVER_HOST` | 服务监听地址 | `0.0.0.0` | 否 |
| `SERVER_PORT` | 服务端口 | `3000` | 否 |
| `DATABASE_URL` | PostgreSQL 连接地址 | - | **是** |
| `JWT_SECRET` | JWT 签名密钥 | - | **是** |
| `JWT_EXPIRES_IN` | JWT 过期时间 | `7d` | 否 |
| `FORCE_FRAMEWORK_DISABLE_DATAPASS` | 禁用平台数据库模块（自建数据库必须设为 true） | `false` | **是** |
| `ENABLE_CSRF` | 是否启用 CSRF 保护 | `false` | 否 |

> **重要**: 自建部署通过环境变量 `FORCE_FRAMEWORK_DISABLE_DATAPASS=true` 禁用妙搭平台的数据库模块，并由 `SelfhostDatabaseModule` 从 `DATABASE_URL` 环境变量创建数据库连接。Docker 镜像和 docker-compose 已默认配置此变量，Render 部署也已预设。

> **关于 CSRF**: 自建部署默认关闭 CSRF 保护（`ENABLE_CSRF=false`）。如需启用，设置 `ENABLE_CSRF=true`，并确保前端请求正确携带 CSRF token（平台 SDK 自动处理，自建环境需自行配置）。

---

## 四、数据库初始化与种子数据

### 4.1 建表

```bash
psql $DATABASE_URL -f deploy/sql/01_schema.sql
```

包含以下 13 张表：

| 表名 | 说明 |
|------|------|
| `product_category` | 商品分类（平台级） |
| `merchant` | 商家 |
| `merchant_category` | 商家内部分类 |
| `product` | 商品 |
| `app_user` | C 端用户 |
| `admin_user` | 管理员 |
| `address` | 收货地址 |
| `cart_item` | 购物车 |
| `order_info` | 订单主表 |
| `order_item` | 订单明细 |
| `banner` | 轮播图 |
| `site_setting` | 站点设置 |
| `notice` | 公告 |

### 4.2 导入种子数据

```bash
# 商家/商品等核心数据
psql $DATABASE_URL -f deploy/sql/02_seed_data.sql

# 管理员/用户/公告等扩展数据
psql $DATABASE_URL -f deploy/sql/03_seed_extra.sql
```

### 4.3 Docker Compose 自动初始化

使用 docker-compose 启动时，PostgreSQL 容器会自动执行 `deploy/sql/` 目录下的所有 `.sql` 文件（仅在数据卷为空时执行一次）。

如果需要重新初始化：

```bash
docker compose -f deploy/docker-compose.yml down -v
docker compose -f deploy/docker-compose.yml up -d
```

---

## 五、各端访问地址与默认账号

### 5.1 C 端用户端

- **地址**: `http://<域名>/`
- **测试账号**:
  - 手机号: `13800138001`
  - 密码: `123456`

### 5.2 商家端

- **地址**: `http://<域名>/merchant/login`
- **测试商家账号** (3 家):

  | 账号 | 密码 | 店铺名 |
  |------|------|--------|
  | `xiangwei` | `123456` | 湘味小炒 |
  | `tiantian` | `123456` | 甜蜜时光甜品店 |
  | `xiancha` | `123456` | 鲜茶道 |

### 5.3 管理后台

- **地址**: `http://<域名>/admin/login`
- **超级管理员账号**:
  - 用户名: `admin`
  - 密码: `000888`

> ⚠️ 部署到生产环境后请立即修改默认密码！

---

## 六、常见问题

### 6.1 启动后部分图片不显示？

种子数据中的部分图片 URL 为妙搭平台存储路径（`/spark/app/...`），自建部署后这些图片无法访问。可通过以下方式替换：

1. 将图片上传到自己的对象存储（如 S3、七牛云、阿里云 OSS 等）
2. 修改数据库中对应记录的图片 URL 字段（如 `product.main_image_url`、`merchant.shop_logo_url` 等）
3. 或在管理后台的「商品管理」「商家设置」中上传新图片

部分 banner 和商品图片已使用 picsum.photos 占位图，可正常访问。

### 6.2 数据库连接失败？

检查 `DATABASE_URL` 格式是否正确：

```
postgresql://<用户名>:<密码>@<主机>:<端口>/<数据库名>
```

### 6.3 如何修改 JWT 密钥？

设置环境变量 `JWT_SECRET` 为你自己的随机字符串。修改后所有已登录用户会被强制登出。

### 6.4 端口冲突怎么办？

修改 `docker-compose.yml` 中的端口映射，例如将 `3000:3000` 改为 `8080:3000`。

---

## 七、生产环境建议

- [ ] 修改所有默认密码
- [ ] 设置强 JWT_SECRET（至少 32 位随机字符串）
- [ ] 启用 HTTPS（Render 自动提供，自建需配置 Nginx + Let's Encrypt）
- [ ] 配置数据库定期备份
- [ ] 限制 PostgreSQL 访问 IP（仅允许应用服务器访问）
- [ ] 设置适当的日志级别和监控告警
