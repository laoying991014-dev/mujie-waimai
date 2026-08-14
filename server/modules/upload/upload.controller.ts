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

const logger = new Logger('Upload');

// Supabase 配置（从环境变量读取）
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'uploads';

@Controller('api/upload')
export class UploadController {
  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(), // 使用内存存储，不写本地磁盘
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
          return cb(new BadRequestException('只支持图片文件'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('请选择要上传的图片');
    }

    // 如果没有配置Supabase，降级返回本地路径（兼容旧逻辑）
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      logger.warn('Supabase未配置，返回原始文件名（生产环境请配置环境变量）');
      return {
        url: `/uploads/${file.originalname}`,
        filename: file.originalname,
        size: file.size,
      };
    }

    try {
      // 生成随机文件名
      const randomName = Array(32)
        .fill(null)
        .map(() => Math.round(Math.random() * 16).toString(16))
        .join('');
      const filename = `${randomName}${extname(file.originalname)}`;
      const filePath = `images/${filename}`;

      // 上传到 Supabase Storage
      const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${filePath}`;

      await axios.put(uploadUrl, file.buffer, {
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          apikey: SUPABASE_SERVICE_KEY,
          'Content-Type': file.mimetype,
          'x-upsert': 'true',
        },
        maxBodyLength: 10 * 1024 * 1024,
      });

      // 构造公开访问URL
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${filePath}`;

      logger.log(`图片上传成功: ${publicUrl}`);

      return {
        url: publicUrl,
        filename,
        size: file.size,
      };
    } catch (error: any) {
      logger.error('上传到Supabase失败', error.response?.data || error.message);
      throw new BadRequestException('图片上传失败，请稍后重试');
    }
  }
}
