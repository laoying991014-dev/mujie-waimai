import { SetMetadata } from '@nestjs/common';

export const Roles = (...roles: ('user' | 'merchant' | 'admin' | 'super')[]) =>
  SetMetadata('roles', roles);
