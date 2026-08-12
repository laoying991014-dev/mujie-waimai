import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

export { logger, axiosForBackend };

export * as auth from './auth';
export * as home from './home';
export * as shop from './shop';
export * as cart from './cart';
export * as order from './order';
export * as address from './address';
export * as userApi from './user';
export * as merchantDashboard from './merchant-dashboard';
export * as merchantSettings from './merchant-settings';
export * as merchantProduct from './merchant-product';
export * as merchantOrder from './merchant-order';
export * as adminDashboard from './admin-dashboard';
export * as adminUser from './admin-user';
export * as adminMerchant from './admin-merchant';
export * as adminProduct from './admin-product';
export * as adminOrder from './admin-order';
export * as adminSetting from './admin-setting';
