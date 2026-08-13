import { APP_FILTER } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { PlatformModule } from '@lark-apaas/fullstack-nestjs-core';

import { GlobalExceptionFilter } from './common/filters/exception.filter';
import { SelfhostDatabaseModule } from './modules/selfhost-database/selfhost-database.module';
import { ViewModule } from './modules/view/view.module';
import { AuthModule } from './modules/auth/auth.module';
import { HomeModule } from './modules/home/home.module';
import { MerchantPublicModule } from './modules/merchant-public/merchant-public.module';
import { CartModule } from './modules/cart/cart.module';
import { OrderModule } from './modules/order/order.module';
import { AddressModule } from './modules/address/address.module';
import { UserProfileModule } from './modules/user-profile/user-profile.module';
import { MerchantDashboardModule } from './modules/merchant-dashboard/merchant-dashboard.module';
import { MerchantShopModule } from './modules/merchant-shop/merchant-shop.module';
import { MerchantProductModule } from './modules/merchant-product/merchant-product.module';
import { MerchantOrderModule } from './modules/merchant-order/merchant-order.module';
import { AdminDashboardModule } from './modules/admin-dashboard/admin-dashboard.module';
import { AdminUserModule } from './modules/admin-user/admin-user.module';
import { AdminMerchantModule } from './modules/admin-merchant/admin-merchant.module';
import { AdminProductModule } from './modules/admin-product/admin-product.module';
import { AdminOrderModule } from './modules/admin-order/admin-order.module';
import { AdminSettingModule } from './modules/admin-setting/admin-setting.module';
import { DatabaseInitModule } from './modules/database-init/database-init.module';
import { UploadModule } from './modules/upload/upload.module';
import { DailyStatModule } from './modules/daily-stat/daily-stat.module';

@Module({
  imports: [
    PlatformModule.forRoot({
      csrf: false,
      enableCsrf: false,
      disableCsrf: true,
    } as any),
    SelfhostDatabaseModule,
    DatabaseInitModule,
    // ====== @route-section: business-modules START ======
    AuthModule,
    HomeModule,
    MerchantPublicModule,
    CartModule,
    OrderModule,
    AddressModule,
    UserProfileModule,
    MerchantDashboardModule,
    MerchantShopModule,
    MerchantProductModule,
    MerchantOrderModule,
    AdminDashboardModule,
    AdminUserModule,
    AdminMerchantModule,
    AdminProductModule,
    AdminOrderModule,
    AdminSettingModule,
    UploadModule,
    DailyStatModule,
    // ====== @route-section: business-modules END ======

    ViewModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
