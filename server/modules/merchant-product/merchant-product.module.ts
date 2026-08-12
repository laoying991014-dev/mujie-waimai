import { Module } from '@nestjs/common';
import { MerchantProductController } from './merchant-product.controller';
import { MerchantProductService } from './merchant-product.service';

@Module({
  controllers: [MerchantProductController],
  providers: [MerchantProductService],
})
export class MerchantProductModule {}
