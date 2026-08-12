import { Controller, Get, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { join } from 'path';
import { existsSync } from 'fs';

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

    // SPA 路由：返回 index.html（用 hbs 渲染模板变量）
    const platformData = (req as any).__platform_data__ ?? {};
    res.render('index', {
      __platform__: JSON.stringify(platformData),
      appName: '木姐外卖',
      appAvatar: '',
      appDescription: '木姐外卖 - 全栈外卖点餐系统',
    });
  }
}
