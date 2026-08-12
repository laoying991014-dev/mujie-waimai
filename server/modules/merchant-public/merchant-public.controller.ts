import { Controller, Get, Param, Query } from '@nestjs/common';
import type {
  MerchantBrief,
  MerchantCategory,
  PaginatedResponse,
  ProductItem,
  ShopDetail,
} from '@shared/api.interface';
import { MerchantPublicService } from './merchant-public.service';

type SortBy = 'default' | 'sales' | 'rating' | 'deliveryFee';

@Controller('api')
export class MerchantPublicController {
  constructor(private readonly merchantPublicService: MerchantPublicService) {}

  @Get('merchants')
  async getMerchantList(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('categoryId') categoryId?: string,
    @Query('keyword') keyword?: string,
    @Query('sortBy') sortBy?: SortBy,
  ): Promise<PaginatedResponse<MerchantBrief>> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 10;
    const validSortBy: SortBy =
      sortBy && ['default', 'sales', 'rating', 'deliveryFee'].includes(sortBy)
        ? sortBy
        : 'default';
    return this.merchantPublicService.getMerchantList(
      Number.isNaN(pageNum) ? 1 : pageNum,
      Number.isNaN(pageSizeNum) ? 10 : pageSizeNum,
      categoryId,
      keyword,
      validSortBy,
    );
  }

  @Get('shops/:id')
  async getShopDetail(@Param('id') id: string): Promise<ShopDetail> {
    return this.merchantPublicService.getShopDetail(id);
  }

  @Get('shops/:id/products')
  async getShopProducts(
    @Param('id') id: string,
  ): Promise<{ categories: MerchantCategory[]; products: ProductItem[] }> {
    return this.merchantPublicService.getShopProducts(id);
  }
}
