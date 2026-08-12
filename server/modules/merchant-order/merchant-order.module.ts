import { Module } from '@nestjs/common';
import { MerchantOrderController } from './merchant-order.controller';
import { MerchantOrderService } from './merchant-order.service';

@Module({
  controllers: [MerchantOrderController],
  providers: [MerchantOrderService],
})
export class MerchantOrderModule {}
