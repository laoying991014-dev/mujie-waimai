import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { randomBytes } from 'crypto';

const logger = new Logger('Upload');

function getSupabaseConfig() {
  const url = (process.env.SUPABASE_URL || '').trim().replace(/\/$/, '');
  const serviceKey = (process.env.SUPABASE_SERVICE_KEY || '').trim();
  const bucket = (process.env.SUPABASE_BUCKET || 'uploads').trim();

  return { url, serviceKey, bucket };
}

@Controller('api/upload')
export class UploadController {
  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
          return cb(new BadRequestException('只支持 JPG、PNG、GIF、WebP、SVG 图片'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('请选择要上传的图片');
    }

    const { url, serviceKey, bucket } = getSupabaseConfig();

    // 生产环境禁止返回一个实际上不存在的本地图片地址。
    // 如果 Supabase 配置缺失，直接报出明确错误，避免后台看起来“上传成功”但图片永远不存在。
    if (!url || !serviceKey || !bucket) {
      logger.error(
        `Supabase 配置不完整: URL=${Boolean(url)}, SERVICE_KEY=${Boolean(serviceKey)}, BUCKET=${bucket || '(empty)'}`,
      );
      throw new BadRequestException('图片存储服务未正确配置，请联系管理员');
    }

    try {
      const filename = `${randomBytes(16).toString('hex')}${extname(file.originalname).toLowerCase()}`;
      const filePath = `images/${filename}`;
      const uploadUrl = `${url}/storage/v1/object/${encodeURIComponent(bucket)}/${filePath}`;

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
          'Content-Type': file.mimetype || 'application/octet-stream',
          'Content-Length': String(file.buffer.length),
          'x-upsert': 'true',
          'cache-control': '3600',
        },
        body: file.buffer,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        logger.error(
          `Supabase 图片上传失败: HTTP ${response.status} ${response.statusText}; ${errorText.slice(0, 500)}`,
        );
        throw new BadRequestException(`图片上传失败（Storage ${response.status}）`);
      }

      // 使用 Supabase Public Bucket 的标准公开地址。
      const publicUrl = `${url}/storage/v1/object/public/${encodeURIComponent(bucket)}/${filePath}`;

      // 上传成功后再返回 URL，前端不会拿到一个假的图片地址。
      logger.log(`图片上传成功: ${filePath}`);

      return {
        url: publicUrl,
        filename,
        path: filePath,
        size: file.size,
        contentType: file.mimetype,
      };
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      logger.error(`图片上传异常: ${error?.message || String(error)}`);
      throw new BadRequestException('图片上传失败，请稍后重试');
    }
  }
}
