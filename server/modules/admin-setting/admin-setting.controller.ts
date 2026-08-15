import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@server/modules/auth/jwt-auth.guard';
import { Roles } from '@server/modules/auth/roles.decorator';
import { AdminSettingService } from './admin-setting.service';
import type { BannerFull, NoticeItemFull, PaginatedResponse, SiteSettings } from '@shared/api.interface';

@Controller('api/admin')
@UseGuards(JwtAuthGuard)
@Roles('admin', 'super')
export class AdminSettingController {
  constructor(private readonly adminSettingService: AdminSettingService) {}
  @Get('notices') async listNotices(@Query('page') page = '1', @Query('pageSize') pageSize = '10'): Promise<PaginatedResponse<NoticeItemFull>> { return this.adminSettingService.listNotices(parseInt(page, 10), parseInt(pageSize, 10)); }
  @Post('notices') async createNotice(@Body() dto: { title: string; content: string; status: 'published' | 'draft' }): Promise<{ id: string }> { return this.adminSettingService.createNotice(dto); }
  @Put('notices/:id') async updateNotice(@Param('id') id: string, @Body() dto: { title: string; content: string; status: 'published' | 'draft' }): Promise<{ success: true }> { return this.adminSettingService.updateNotice(id, dto); }
  @Delete('notices/:id') async deleteNotice(@Param('id') id: string): Promise<{ success: true }> { return this.adminSettingService.deleteNotice(id); }
  @Get('site-settings') async getSiteSettings(): Promise<SiteSettings> { return this.adminSettingService.getSiteSettings(); }
  @Put('site-settings') async saveSiteSettings(@Body() dto: SiteSettings): Promise<{ success: true }> { return this.adminSettingService.saveSiteSettings(dto); }
  @Get('banners') async listBanners(): Promise<{ items: BannerFull[] }> { return this.adminSettingService.listBanners(); }
  @Post('banners') async createBanner(@Body() dto: { title: string; imageUrl: string; linkUrl: string; sortOrder: number }): Promise<{ id: string }> { return this.adminSettingService.createBanner(dto); }
  @Put('banners/:id') async updateBanner(@Param('id') id: string, @Body() dto: { title: string; imageUrl: string; linkUrl: string; sortOrder: number; status: 'active' | 'inactive' }): Promise<{ success: true }> { return this.adminSettingService.updateBanner(id, dto); }
  @Delete('banners/:id') async deleteBanner(@Param('id') id: string): Promise<{ success: true }> { return this.adminSettingService.deleteBanner(id); }
}
