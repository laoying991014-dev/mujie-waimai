import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { count, eq, desc, asc, sql } from 'drizzle-orm';
import { notice, siteSetting, banner } from '@server/database/schema';
import type { BannerFull, NoticeItemFull, PaginatedResponse, SiteSettings } from '@shared/api.interface';

interface CreateNoticeDto { title: string; content: string; status: 'published' | 'draft'; }
interface UpdateNoticeDto { title: string; content: string; status: 'published' | 'draft'; }
interface CreateBannerDto { title: string; imageUrl: string; linkUrl: string; sortOrder: number; }
interface UpdateBannerDto { title: string; imageUrl: string; linkUrl: string; sortOrder: number; status: 'active' | 'inactive'; }

const DEFAULT_SITE_SETTINGS: SiteSettings = { siteName: '南坎极速外卖', siteLogoUrl: '', customerServicePhone: '', paymentName: '', paymentPhone: '', paymentQrUrl: '', icpInfo: '', copyrightInfo: '' };

@Injectable()
export class AdminSettingService {
  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  private async ensurePaymentSettingSchema(): Promise<void> {
    await this.db.execute(sql`CREATE TABLE IF NOT EXISTS payment_setting (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), payment_phone varchar(20) NOT NULL DEFAULT '', payment_qr_url text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
    await this.db.execute(sql`ALTER TABLE payment_setting ADD COLUMN IF NOT EXISTS payment_name varchar(100) NOT NULL DEFAULT ''`);
    await this.db.execute(sql`ALTER TABLE payment_setting ADD COLUMN IF NOT EXISTS merchant_id uuid`);
    await this.db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS payment_setting_merchant_id_key ON payment_setting (merchant_id) WHERE merchant_id IS NOT NULL`);
  }

  async listNotices(page: number, pageSize: number): Promise<PaginatedResponse<NoticeItemFull>> {
    const offset = (page - 1) * pageSize;
    const [itemsResult, totalResult] = await Promise.all([this.db.select({ id: notice.id, title: notice.title, status: notice.status, createdAt: notice.createdAt }).from(notice).orderBy(desc(notice.createdAt)).limit(pageSize).offset(offset), this.db.select({ count: count() }).from(notice)]);
    return { items: itemsResult.map((row) => ({ id: row.id, title: row.title, status: row.status as 'published' | 'draft', createdAt: row.createdAt.toISOString() })), total: Number(totalResult[0]?.count ?? 0), page, pageSize };
  }
  async createNotice(dto: CreateNoticeDto): Promise<{ id: string }> { const result = await this.db.insert(notice).values(dto).returning({ id: notice.id }); return { id: result[0].id }; }
  async updateNotice(id: string, dto: UpdateNoticeDto): Promise<{ success: true }> { const result = await this.db.update(notice).set(dto).where(eq(notice.id, id)).returning({ id: notice.id }); if (!result.length) throw new NotFoundException('公告不存在'); return { success: true }; }
  async deleteNotice(id: string): Promise<{ success: true }> { const result = await this.db.delete(notice).where(eq(notice.id, id)).returning({ id: notice.id }); if (!result.length) throw new NotFoundException('公告不存在'); return { success: true }; }

  async getSiteSettings(): Promise<SiteSettings> {
    await this.ensurePaymentSettingSchema();
    const rows = await this.db.select({ siteName: siteSetting.siteName, siteLogoUrl: siteSetting.siteLogoUrl, customerServicePhone: siteSetting.customerServicePhone, icpInfo: siteSetting.icpInfo, copyrightInfo: siteSetting.copyrightInfo }).from(siteSetting).limit(1);
    const paymentRows: any[] = await this.db.execute(sql`SELECT payment_name, payment_phone, payment_qr_url FROM payment_setting WHERE merchant_id IS NULL ORDER BY created_at ASC LIMIT 1`);
    if (!rows.length) return { ...DEFAULT_SITE_SETTINGS, paymentName: paymentRows[0]?.payment_name || '', paymentPhone: paymentRows[0]?.payment_phone || '', paymentQrUrl: paymentRows[0]?.payment_qr_url || '' };
    const row = rows[0];
    return { siteName: row.siteName, siteLogoUrl: row.siteLogoUrl, customerServicePhone: row.customerServicePhone, paymentName: paymentRows[0]?.payment_name || '', paymentPhone: paymentRows[0]?.payment_phone || '', paymentQrUrl: paymentRows[0]?.payment_qr_url || '', icpInfo: row.icpInfo, copyrightInfo: row.copyrightInfo };
  }

  async saveSiteSettings(dto: SiteSettings): Promise<{ success: true }> {
    await this.ensurePaymentSettingSchema();
    const existing = await this.db.select({ id: siteSetting.id }).from(siteSetting).limit(1);
    if (!existing.length) await this.db.insert(siteSetting).values({ siteName: dto.siteName, siteLogoUrl: dto.siteLogoUrl, customerServicePhone: dto.customerServicePhone, icpInfo: dto.icpInfo, copyrightInfo: dto.copyrightInfo });
    else await this.db.update(siteSetting).set({ siteName: dto.siteName, siteLogoUrl: dto.siteLogoUrl, customerServicePhone: dto.customerServicePhone, icpInfo: dto.icpInfo, copyrightInfo: dto.copyrightInfo }).where(eq(siteSetting.id, existing[0].id));
    const paymentRows: any[] = await this.db.execute(sql`SELECT id FROM payment_setting WHERE merchant_id IS NULL ORDER BY created_at ASC LIMIT 1`);
    if (!paymentRows.length) await this.db.execute(sql`INSERT INTO payment_setting (payment_name, payment_phone, payment_qr_url, merchant_id) VALUES (${dto.paymentName || ''}, ${dto.paymentPhone || ''}, ${dto.paymentQrUrl || ''}, NULL)`);
    else await this.db.execute(sql`UPDATE payment_setting SET payment_name = ${dto.paymentName || ''}, payment_phone = ${dto.paymentPhone || ''}, payment_qr_url = ${dto.paymentQrUrl || ''}, updated_at = CURRENT_TIMESTAMP WHERE id = ${paymentRows[0].id}`);
    return { success: true };
  }

  async listBanners(): Promise<{ items: BannerFull[] }> { const rows = await this.db.select({ id: banner.id, title: banner.title, imageUrl: banner.imageUrl, linkUrl: banner.linkUrl, sortOrder: banner.sortOrder, status: banner.status }).from(banner).orderBy(asc(banner.sortOrder)); return { items: rows.map((row) => ({ id: row.id, title: row.title, imageUrl: row.imageUrl, linkUrl: row.linkUrl, sortOrder: row.sortOrder, status: row.status as 'active' | 'inactive' })) }; }
  async createBanner(dto: CreateBannerDto): Promise<{ id: string }> { const result = await this.db.insert(banner).values(dto).returning({ id: banner.id }); return { id: result[0].id }; }
  async updateBanner(id: string, dto: UpdateBannerDto): Promise<{ success: true }> { const result = await this.db.update(banner).set(dto).where(eq(banner.id, id)).returning({ id: banner.id }); if (!result.length) throw new NotFoundException('活动不存在'); return { success: true }; }
  async deleteBanner(id: string): Promise<{ success: true }> { const result = await this.db.delete(banner).where(eq(banner.id, id)).returning({ id: banner.id }); if (!result.length) throw new NotFoundException('活动不存在'); return { success: true }; }
}
