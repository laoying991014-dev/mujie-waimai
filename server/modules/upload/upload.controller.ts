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
import axios from 'axios';
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
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('请选择要上传的图片');

    const { url, serviceKey, bucket } = getSupabaseConfig();
    if (!url || !serviceKey || !bucket) {
      logger.error(`Supabase 配置不完整: URL=${Boolean(url)}, SERVICE_KEY=${Boolean(serviceKey)}, BUCKET=${Boolean(bucket)}`);
      throw new BadRequestException('图片存储服务未正确配置，请联系管理员');
    }

    try {
      const filename = `${randomBytes(16).toString('hex')}${extname(file.originalname).toLowerCase()}`;
      const filePath = `images/${filename}`;
      const encodedBucket = encodeURIComponent(bucket);
      const uploadUrl = `${url}/storage/v1/object/${encodedBucket}/${filePath}`;

      await axios.post(uploadUrl, file.buffer, {
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
          'Content-Type': file.mimetype || 'application/octet-stream',
          'x-upsert': 'true',
        },
        maxBodyLength: 10 * 1024 * 1024,
        maxContentLength: 10 * 1024 * 1024,
        validateStatus: () => true,
      }).then((response) => {
        if (response.status < 200 || response.status >= 300) {
          const detail = typeof response.data === 'string' ? response.data : JSON.stringify(response.data || {});
          logger.error(`Supabase 图片上传失败: HTTP ${response.status}; ${detail.slice(0, 500)}`);
          throw new BadRequestException(`图片上传失败（Storage ${response.status}）`);
        }
      });

      const publicUrl = `${url}/storage/v1/object/public/${encodedBucket}/${filePath}`;
      logger.log(`图片上传成功: ${filePath}`);

      return {
        url: publicUrl,
        filename,
        path: filePath,
        size: file.size,
        contentType: file.mimetype,
      };
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      logger.error(`图片上传异常: ${error?.message || String(error)}`);
      throw new BadRequestException('图片上传失败，请稍后重试');
    }
  }
}
