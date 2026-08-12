import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@server/modules/auth/jwt-auth.guard';
import { Roles } from '@server/modules/auth/roles.decorator';
import { AdminProductService } from './admin-product.service';
import type { ProductDetail } from './admin-product.service';
import type {
  AdminProduct,
  PaginatedResponse,
  ProductCategory,
} from '@shared/api.interface';

@Controller('api/admin')
@UseGuards(JwtAuthGuard)
@Roles('admin', 'super')
export class AdminProductController {
  constructor(private readonly adminProductService: AdminProductService) {}

  // ==== Categories ====

  @Get('categories')
  async listCategories(): Promise<{ items: ProductCategory[] }> {
    return this.adminProductService.listCategories();
  }

  @Post('categories')
  async createCategory(
    @Body() dto: { name: string; iconUrl: string; sortOrder: number },
  ): Promise<{ id: string }> {
    return this.adminProductService.createCategory(dto);
  }

  @Put('categories/:id')
  async updateCategory(
    @Param('id') id: string,
    @Body()
    dto: {
      name: string;
      iconUrl: string;
      sortOrder: number;
      status: 'active' | 'inactive';
    },
  ): Promise<{ success: true }> {
    return this.adminProductService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  async deleteCategory(@Param('id') id: string): Promise<{ success: true }> {
    return this.adminProductService.deleteCategory(id);
  }

  // ==== Products ====

  @Get('products')
  async listProducts(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '10',
    @Query('merchantId') merchantId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('status') status: 'all' | 'on_sale' | 'off_sale' = 'all',
    @Query('keyword') keyword = '',
  ): Promise<PaginatedResponse<AdminProduct>> {
    const validStatuses: Array<'all' | 'on_sale' | 'off_sale'> = [
      'all',
      'on_sale',
      'off_sale',
    ];
    const safeStatus = validStatuses.includes(status) ? status : 'all';
    return this.adminProductService.listProducts(
      parseInt(page, 10),
      parseInt(pageSize, 10),
      merchantId,
      categoryId,
      safeStatus,
      keyword,
    );
  }

  @Patch('products/:id/force-off')
  async forceOffShelf(
    @Param('id') id: string,
  ): Promise<{ success: true; status: string }> {
    return this.adminProductService.forceOffShelf(id);
  }

  @Get('products/:id')
  async getProductDetail(@Param('id') id: string): Promise<ProductDetail> {
    return this.adminProductService.getProductDetail(id);
  }
}
