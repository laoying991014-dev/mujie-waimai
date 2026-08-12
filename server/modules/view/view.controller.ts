import { Controller, Get, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { join } from 'path';
import { existsSync } from 'fs';

@Controller()
export class ViewController {
  @Get(['/', '*'])
  async render(@Req() req: Request, @Res() res: Response): Promise<void> {
    // 排除 API 路由
    if (req.path.startsWith('/api')) {
      res.status(404).json({ message: 'Not Found' });
      return;
    }
    // 自动检测 index.html 位置（优先 dist/client，其次 dist）
    let indexPath = join(process.cwd(), 'dist/client/index.html');
    if (!existsSync(indexPath)) {
      indexPath = join(process.cwd(), 'dist/index.html');
    }
    // 直接发送 index.html，避免 hbs 模板引擎处理 HTML 内容
    res.sendFile(indexPath);
  }
}
