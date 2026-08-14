import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';

export interface JwtPayload {
  id: string;
  role: 'user' | 'merchant' | 'admin' | 'super' | 'rider';
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('未登录');
    }

    const token = authHeader.split(' ')[1];
    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      req.user = payload;
      const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler())
        ?? this.reflector.get<string[]>('roles', context.getClass());
      if (requiredRoles && requiredRoles.length > 0) {
        if (!requiredRoles.includes(payload.role)) {
          throw new UnauthorizedException('权限不足');
        }
      }
      return true;
    } catch {
      throw new UnauthorizedException('登录已过期');
    }
  }
}
