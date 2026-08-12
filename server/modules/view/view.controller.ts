import { Controller, Get, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

@Controller()
export class ViewController {
  @Get(['/', '*'])
  async render(@Req() req: Request, @Res() res: Response): Promise<void> {
    // API 路由返回 404
    if (req.path.startsWith('/api')) {
      res.status(404).json({ message: 'Not Found' });
      return;
    }

    // 自动检测前端目录
    let clientDir = join(process.cwd(), 'dist/client');
    if (!existsSync(join(clientDir, 'index.html'))) {
      clientDir = join(process.cwd(), 'dist');
    }

    // 检查请求的静态文件是否存在（如 /assets/xxx.js, /favicon.svg）
    const filePath = join(clientDir, req.path);
    if (existsSync(filePath) && req.path !== '/') {
      res.sendFile(filePath);
      return;
    }

    // 手动读取 index.html 并替换模板变量
    const indexPath = join(clientDir, 'index.html');
    if (!existsSync(indexPath)) {
      res.status(500).send('index.html not found');
      return;
    }

    let html = readFileSync(indexPath, 'utf-8');

    // 替换模板变量
    const platformData = (req as any).__platform_data__ ?? {};
    html = html.replace(/\{\{\{__platform__\}\}\}/g, JSON.stringify(platformData).replace(/"/g, '&quot;'));
    html = html.replace(/\{\{__platform__\}\}/g, JSON.stringify(platformData));
    html = html.replace(/\{\{appName\}\}/g, '木姐外卖');
    html = html.replace(/\{\{appAvatar\}\}/g, '');
    html = html.replace(/\{\{appDescription\}\}/g, '木姐外卖 - 全栈外卖点餐系统');

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }
}
