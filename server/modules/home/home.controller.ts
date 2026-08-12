import { Controller, Get, Query } from '@nestjs/common';
import type {
  BannerItem,
  CategoryItem,
  HotProductItem,
  MerchantBrief,
  NoticeItem,
} from '@shared/api.interface';
import { HomeService } from './home.service';

@Controller('api/home')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get('categories')
  async getCategories(): Promise<{ items: CategoryItem[] }> {
    return this.homeService.getCategories();
  }

  @Get('banners')
  async getBanners(): Promise<{ items: BannerItem[] }> {
    return this.homeService.getBanners();
  }

  @Get('notices')
  async getNotices(): Promise<{ items: NoticeItem[] }> {
    return this.homeService.getNotices();
  }

  @Get('recommended-merchants')
  async getRecommendedMerchants(): Promise<{ items: MerchantBrief[] }> {
    return this.homeService.getRecommendedMerchants();
  }

  @Get('nearby-merchants')
  async getNearbyMerchants(@Query('limit') limit?: string): Promise<{ items: MerchantBrief[] }> {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.homeService.getNearbyMerchants(Number.isNaN(limitNum) ? 10 : limitNum);
  }

  @Get('hot-products')
  async getHotProducts(@Query('limit') limit?: string): Promise<{ items: HotProductItem[] }> {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.homeService.getHotProducts(Number.isNaN(limitNum) ? 10 : limitNum);
  }

  @Get('search')
  async search(
    @Query('keyword') keyword: string,
  ): Promise<{ merchants: MerchantBrief[]; products: HotProductItem[] }> {
    return this.homeService.search(keyword || '');
  }
}
