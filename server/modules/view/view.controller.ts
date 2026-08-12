import { Controller, Get, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

@Controller()
export class ViewController {
  @Get(['/', '*'])
  async render(@Req() req: Request, @Res() res: Response): Promise<void> {
    const path = req.path;

    // 排除 API 和其他非页面请求
    if (
      path.startsWith('/api') ||
      path.startsWith('/spark') ||
      path.startsWith('/metrics') ||
      path.startsWith('/health') ||
      path.startsWith('/static')
    ) {
      res.status(404).json({ message: 'Not Found' });
      return;
    }

    // 只对接受 HTML 的请求返回页面（通过 Accept 头判断）
    const accept = req.headers.accept || '';
    const isHtmlRequest = accept.includes('text/html') || accept.includes('*/*');

    // 自动检测前端目录
    let clientDir = join(process.cwd(), 'dist/client');
    if (!existsSync(join(clientDir, 'index.html'))) {
      clientDir = join(process.cwd(), 'dist');
    }

    // 检查请求的静态文件是否存在（如 /assets/xxx.js, /favicon.svg）
    const filePath = join(clientDir, path);
    if (existsSync(filePath) && path !== '/') {
      res.sendFile(filePath);
      return;
    }

    // 如果不是 HTML 请求，返回 404
    if (!isHtmlRequest && path !== '/') {
      res.status(404).json({ message: 'Not Found' });
      return;
    }

    // 手动读取 index.html 并替换模板变量
    const indexPath = join(clientDir, 'index.html');
    if (!existsSync(indexPath)) {
      res.status(500).send('index.html not found');
      return;
    }

    let html = readFileSync(indexPath, 'utf-8');

    // 替换模板变量 - 用更宽松的正则，处理可能的空格和不同括号数量
    html = html.replace(/\{\{+\s*__platform__\s*\}\}+/g, '{}');
    html = html.replace(/\{\{+\s*appName\s*\}\}+/g, '木姐外卖');
    html = html.replace(/\{\{+\s*appAvatar\s*\}\}+/g, '');
    html = html.replace(/\{\{+\s*appDescription\s*\}\}+/g, '木姐外卖 - 全栈外卖点餐系统');

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }
}
