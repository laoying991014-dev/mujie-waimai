import { Module } from '@nestjs/common';
import { MerchantPublicController } from './merchant-public.controller';
import { MerchantPublicService } from './merchant-public.service';

@Module({
  controllers: [MerchantPublicController],
  providers: [MerchantPublicService],
})
export class MerchantPublicModule {}
