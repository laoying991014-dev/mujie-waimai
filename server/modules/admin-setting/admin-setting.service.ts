import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { count, eq, desc, asc } from 'drizzle-orm';
import { notice, siteSetting, banner } from '@server/database/schema';
import type {
  BannerFull,
  NoticeItemFull,
  PaginatedResponse,
  SiteSettings,
} from '@shared/api.interface';

interface CreateNoticeDto {
  title: string;
  content: string;
  status: 'published' | 'draft';
}

interface UpdateNoticeDto {
  title: string;
  content: string;
  status: 'published' | 'draft';
}

interface CreateBannerDto {
  title: string;
  imageUrl: string;
  linkUrl: string;
  sortOrder: number;
}

interface UpdateBannerDto {
  title: string;
  imageUrl: string;
  linkUrl: string;
  sortOrder: number;
  status: 'active' | 'inactive';
}

const DEFAULT_SITE_SETTINGS: SiteSettings = {
  siteName: '木姐外卖',
  siteLogoUrl: '',
  customerServicePhone: '',
  icpInfo: '',
  copyrightInfo: '',
};

@Injectable()
export class AdminSettingService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  // ==== Notices ====

  async listNotices(
    page: number,
    pageSize: number,
  ): Promise<PaginatedResponse<NoticeItemFull>> {
    const offset = (page - 1) * pageSize;

    const [itemsResult, totalResult] = await Promise.all([
      this.db
        .select({
          id: notice.id,
          title: notice.title,
          status: notice.status,
          createdAt: notice.createdAt,
        })
        .from(notice)
        .orderBy(desc(notice.createdAt))
        .limit(pageSize)
        .offset(offset),
      this.db.select({ count: count() }).from(notice),
    ]);

    const items: NoticeItemFull[] = itemsResult.map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status as 'published' | 'draft',
      createdAt: row.createdAt.toISOString(),
    }));

    return {
      items,
      total: Number(totalResult[0]?.count ?? 0),
      page,
      pageSize,
    };
  }

  async createNotice(dto: CreateNoticeDto): Promise<{ id: string }> {
    const result = await this.db
      .insert(notice)
      .values({
        title: dto.title,
        content: dto.content,
        status: dto.status,
      })
      .returning({ id: notice.id });

    return { id: result[0].id };
  }

  async updateNotice(
    id: string,
    dto: UpdateNoticeDto,
  ): Promise<{ success: true }> {
    const result = await this.db
      .update(notice)
      .set({
        title: dto.title,
        content: dto.content,
        status: dto.status,
      })
      .where(eq(notice.id, id))
      .returning({ id: notice.id });

    if (result.length === 0) {
      throw new NotFoundException('公告不存在');
    }

    return { success: true };
  }

  async deleteNotice(id: string): Promise<{ success: true }> {
    const result = await this.db
      .delete(notice)
      .where(eq(notice.id, id))
      .returning({ id: notice.id });

    if (result.length === 0) {
      throw new NotFoundException('公告不存在');
    }

    return { success: true };
  }

  // ==== Site Settings ====

  async getSiteSettings(): Promise<SiteSettings> {
    const rows = await this.db
      .select({
        siteName: siteSetting.siteName,
        siteLogoUrl: siteSetting.siteLogoUrl,
        customerServicePhone: siteSetting.customerServicePhone,
        icpInfo: siteSetting.icpInfo,
        copyrightInfo: siteSetting.copyrightInfo,
      })
      .from(siteSetting)
      .limit(1);

    if (rows.length === 0) {
      return DEFAULT_SITE_SETTINGS;
    }

    const row = rows[0];
    return {
      siteName: row.siteName,
      siteLogoUrl: row.siteLogoUrl,
      customerServicePhone: row.customerServicePhone,
      icpInfo: row.icpInfo,
      copyrightInfo: row.copyrightInfo,
    };
  }

  async saveSiteSettings(dto: SiteSettings): Promise<{ success: true }> {
    const existing = await this.db
      .select({ id: siteSetting.id })
      .from(siteSetting)
      .limit(1);

    if (existing.length === 0) {
      await this.db.insert(siteSetting).values({
        siteName: dto.siteName,
        siteLogoUrl: dto.siteLogoUrl,
        customerServicePhone: dto.customerServicePhone,
        icpInfo: dto.icpInfo,
        copyrightInfo: dto.copyrightInfo,
      });
    } else {
      await this.db
        .update(siteSetting)
        .set({
          siteName: dto.siteName,
          siteLogoUrl: dto.siteLogoUrl,
          customerServicePhone: dto.customerServicePhone,
          icpInfo: dto.icpInfo,
          copyrightInfo: dto.copyrightInfo,
        })
        .where(eq(siteSetting.id, existing[0].id));
    }

    return { success: true };
  }

  // ==== Banners ====

  async listBanners(): Promise<{ items: BannerFull[] }> {
    const rows = await this.db
      .select({
        id: banner.id,
        title: banner.title,
        imageUrl: banner.imageUrl,
        linkUrl: banner.linkUrl,
        sortOrder: banner.sortOrder,
        status: banner.status,
      })
      .from(banner)
      .orderBy(asc(banner.sortOrder));

    const items: BannerFull[] = rows.map((row) => ({
      id: row.id,
      title: row.title,
      imageUrl: row.imageUrl,
      linkUrl: row.linkUrl,
      sortOrder: row.sortOrder,
      status: row.status as 'active' | 'inactive',
    }));

    return { items };
  }

  async createBanner(dto: CreateBannerDto): Promise<{ id: string }> {
    const result = await this.db
      .insert(banner)
      .values({
        title: dto.title,
        imageUrl: dto.imageUrl,
        linkUrl: dto.linkUrl,
        sortOrder: dto.sortOrder,
      })
      .returning({ id: banner.id });

    return { id: result[0].id };
  }

  async updateBanner(
    id: string,
    dto: UpdateBannerDto,
  ): Promise<{ success: true }> {
    const result = await this.db
      .update(banner)
      .set({
        title: dto.title,
        imageUrl: dto.imageUrl,
        linkUrl: dto.linkUrl,
        sortOrder: dto.sortOrder,
        status: dto.status,
      })
      .where(eq(banner.id, id))
      .returning({ id: banner.id });

    if (result.length === 0) {
      throw new NotFoundException('活动不存在');
    }

    return { success: true };
  }

  async deleteBanner(id: string): Promise<{ success: true }> {
    const result = await this.db
      .delete(banner)
      .where(eq(banner.id, id))
      .returning({ id: banner.id });

    if (result.length === 0) {
      throw new NotFoundException('活动不存在');
    }

    return { success: true };
  }
}
