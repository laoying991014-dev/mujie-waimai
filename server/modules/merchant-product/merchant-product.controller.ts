import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MerchantProductService } from './merchant-product.service';
import type { Request } from 'express';
import type { JwtPayload } from '../auth/jwt-auth.guard';

@Controller('api/merchant')
@UseGuards(JwtAuthGuard)
@Roles('merchant')
export class MerchantProductController {
  constructor(
    private readonly merchantProductService: MerchantProductService,
  ) {}

  // ---- Categories ----

  @Get('categories')
  async getCategories(@Req() req: Request & { user: JwtPayload }) {
    return this.merchantProductService.getCategories(req.user.id);
  }

  @Post('categories')
  async createCategory(
    @Req() req: Request & { user: JwtPayload },
    @Body() body: { name: string; sortOrder: number },
  ) {
    const sortOrder =
      typeof body.sortOrder === 'number'
        ? body.sortOrder
        : parseInt(String(body.sortOrder ?? '0'), 10) || 0;
    return this.merchantProductService.createCategory(
      req.user.id,
      body.name,
      sortOrder,
    );
  }

  @Put('categories/:id')
  async updateCategory(
    @Req() req: Request & { user: JwtPayload },
    @Param('id') id: string,
    @Body() body: { name: string; sortOrder: number },
  ) {
    const sortOrder =
      typeof body.sortOrder === 'number'
        ? body.sortOrder
        : parseInt(String(body.sortOrder ?? '0'), 10) || 0;
    return this.merchantProductService.updateCategory(
      req.user.id,
      id,
      body.name,
      sortOrder,
    );
  }

  @Delete('categories/:id')
  async deleteCategory(
    @Req() req: Request & { user: JwtPayload },
    @Param('id') id: string,
  ) {
    return this.merchantProductService.deleteCategory(req.user.id, id);
  }

  // ---- Products ----

  @Get('products')
  async getProducts(
    @Req() req: Request & { user: JwtPayload },
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('categoryId') categoryId?: string,
    @Query('keyword') keyword?: string,
    @Query('status') status?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 10;
    return this.merchantProductService.getProducts(req.user.id, {
      page: Math.max(1, pageNum),
      pageSize: Math.max(1, Math.min(100, pageSizeNum)),
      categoryId,
      keyword,
      status:
        status === 'on_sale' || status === 'off_sale'
          ? status
          : 'all',
    });
  }

  @Post('products')
  async createProduct(
    @Req() req: Request & { user: JwtPayload },
    @Body()
    body: {
      name: string;
      description: string;
      price: string;
      stock: number;
      categoryId?: string;
      mainImageUrl: string;
      status: 'on_sale' | 'off_sale';
    },
  ) {
    return this.merchantProductService.createProduct(req.user.id, {
      name: body.name,
      description: body.description ?? '',
      price: String(body.price),
      stock:
        typeof body.stock === 'number'
          ? body.stock
          : parseInt(String(body.stock ?? '0'), 10) || 0,
      categoryId: body.categoryId || undefined,
      mainImageUrl: body.mainImageUrl,
      status: body.status === 'off_sale' ? 'off_sale' : 'on_sale',
    });
  }

  @Put('products/:id')
  async updateProduct(
    @Req() req: Request & { user: JwtPayload },
    @Param('id') id: string,
    @Body()
    body: {
      name: string;
      description: string;
      price: string;
      stock: number;
      categoryId?: string;
      mainImageUrl: string;
      status: 'on_sale' | 'off_sale';
    },
  ) {
    return this.merchantProductService.updateProduct(req.user.id, id, {
      name: body.name,
      description: body.description ?? '',
      price: String(body.price),
      stock:
        typeof body.stock === 'number'
          ? body.stock
          : parseInt(String(body.stock ?? '0'), 10) || 0,
      categoryId: body.categoryId || undefined,
      mainImageUrl: body.mainImageUrl,
      status: body.status === 'off_sale' ? 'off_sale' : 'on_sale',
    });
  }

  @Delete('products/:id')
  async deleteProduct(
    @Req() req: Request & { user: JwtPayload },
    @Param('id') id: string,
  ) {
    return this.merchantProductService.deleteProduct(req.user.id, id);
  }

  @Patch('products/:id/status')
  async updateProductStatus(
    @Req() req: Request & { user: JwtPayload },
    @Param('id') id: string,
    @Body() body: { status: 'on_sale' | 'off_sale' },
  ) {
    return this.merchantProductService.updateProductStatus(
      req.user.id,
      id,
      body.status === 'off_sale' ? 'off_sale' : 'on_sale',
    );
  }
}
