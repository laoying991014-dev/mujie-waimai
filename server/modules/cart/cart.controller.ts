import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import type { CartInfo } from '@shared/api.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { CartService } from './cart.service';

@UseGuards(JwtAuthGuard)
@Roles('user')
@Controller('api/cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  async getCart(@Req() req: any): Promise<CartInfo> {
    const user = req.user;
    return this.cartService.getCart(user.id);
  }

  @Post('items')
  async addItem(
    @Req() req: any,
    @Body() body: { productId: string; quantity: number },
  ): Promise<{ id: string; quantity: number }> {
    const user = req.user;
    return this.cartService.addItem(user.id, body.productId, Number(body.quantity));
  }

  @Patch('items/:id')
  async updateQuantity(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { quantity: number },
  ): Promise<{ id: string; quantity: number }> {
    const user = req.user;
    return this.cartService.updateQuantity(user.id, id, Number(body.quantity));
  }

  @Delete('items/:id')
  async removeItem(@Req() req: any, @Param('id') id: string): Promise<{ success: true }> {
    const user = req.user;
    return this.cartService.removeItem(user.id, id);
  }

  @Delete()
  async clearCart(@Req() req: any): Promise<{ success: true }> {
    const user = req.user;
    return this.cartService.clearCart(user.id);
  }
}
