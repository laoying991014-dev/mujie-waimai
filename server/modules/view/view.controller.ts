import { Controller, Get, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { join } from 'path';

@Controller()
export class ViewController {
  @Get(['/', '*'])
  async render(@Req() req: Request, @Res() res: Response): Promise<void> {
    // 排除 API 路由
    if (req.path.startsWith('/api')) {
      res.status(404).json({ message: 'Not Found' });
      return;
    }
    // 直接发送 index.html，避免 hbs 模板引擎处理 HTML 内容
    res.sendFile(join(process.cwd(), 'dist/client/index.html'));
  }
}
