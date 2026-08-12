import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { configureApp } from '@lark-apaas/fullstack-nestjs-core';
import { join } from 'path';
import { existsSync } from 'fs';
import { __express as hbsExpressEngine } from 'hbs';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    abortOnError: process.env.NODE_ENV !== 'development',
  });
  await configureApp(app, {
    disableSwagger: true,
  });
  const logger = new Logger('Bootstrap');
  const host = process.env.SERVER_HOST || 'localhost';
  const port = Number(process.env.SERVER_PORT || '3000');

  // 自动检测前端构建产物目录（优先 dist/client，其次 dist）
  let clientDir = join(process.cwd(), 'dist/client');
  if (!existsSync(join(clientDir, 'index.html'))) {
    clientDir = join(process.cwd(), 'dist');
  }
  logger.log(`前端静态资源目录: ${clientDir}`);

  // 托管前端静态资源（JS、CSS、图片等）
  app.useStaticAssets(clientDir, {
    prefix: '/',
  });

  // 注册视图引擎
  app.setBaseViewsDir(clientDir);
  app.setViewEngine('html');
  app.engine('html', hbsExpressEngine);

  await app.listen(port, host);
  logger.log(`Server running on ${host}:${port}`);
  logger.log(`API endpoints ready at http://${host}:${port}/api`);
}
bootstrap();
