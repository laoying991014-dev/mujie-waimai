import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq } from 'drizzle-orm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { appUser, merchant, adminUser, rider } from '../../database/schema';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly jwtService: JwtService,
  ) {}

  async registerUser(phone: string, password: string, nickname?: string) {
    const existing = await this.db.select().from(appUser).where(eq(appUser.phone, phone)).limit(1);
    if (existing.length > 0) {
      throw new ConflictException('手机号已注册');
    }
    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = await this.db.insert(appUser).values({
      phone,
      password: hashedPassword,
      nickname: nickname || `用户${phone.slice(-4)}`,
      avatarUrl: '',
      status: 'active',
    }).returning({ id: appUser.id, phone: appUser.phone, nickname: appUser.nickname, avatarUrl: appUser.avatarUrl });
    const user = result[0];
    const token = this.jwtService.sign({ id: user.id, role: 'user' });
    return { token, user };
  }

  async loginUser(phone: string, password: string) {
    const users = await this.db.select().from(appUser).where(eq(appUser.phone, phone)).limit(1);
    if (users.length === 0) {
      throw new UnauthorizedException('手机号或密码错误');
    }
    const user = users[0];
    if (user.status !== 'active') {
      throw new UnauthorizedException('账号已被禁用');
    }
    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
      throw new UnauthorizedException('手机号或密码错误');
    }
    const token = this.jwtService.sign({ id: user.id, role: 'user' });
    return {
      token,
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  async loginMerchant(account: string, password: string) {
    const merchants = await this.db.select().from(merchant).where(eq(merchant.account, account)).limit(1);
    if (merchants.length === 0) {
      throw new UnauthorizedException('账号或密码错误');
    }
    const m = merchants[0];
    if (m.status !== 'active') {
      throw new UnauthorizedException('账号已被禁用');
    }
    if (m.auditStatus !== 'approved') {
      throw new UnauthorizedException('店铺审核未通过');
    }
    const valid = bcrypt.compareSync(password, m.password);
    if (!valid) {
      throw new UnauthorizedException('账号或密码错误');
    }
    const token = this.jwtService.sign({ id: m.id, role: 'merchant' });
    return {
      token,
      merchant: {
        id: m.id,
        account: m.account,
        shopName: m.shopName,
        shopLogoUrl: m.shopLogoUrl,
      },
    };
  }

  async loginAdmin(username: string, password: string) {
    const admins = await this.db.select().from(adminUser).where(eq(adminUser.username, username)).limit(1);
    if (admins.length === 0) {
      throw new UnauthorizedException('用户名或密码错误');
    }
    const admin = admins[0];
    if (admin.status !== 'active') {
      throw new UnauthorizedException('账号已被禁用');
    }
    const valid = bcrypt.compareSync(password, admin.password);
    if (!valid) {
      throw new UnauthorizedException('用户名或密码错误');
    }
    const token = this.jwtService.sign({ id: admin.id, role: 'admin' });
    return {
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        realName: admin.realName,
        role: admin.role,
      },
    };
  }

  async loginRider(account: string, password: string) {
    const riders = await this.db.select().from(rider).where(eq(rider.account, account)).limit(1);
    if (riders.length === 0) {
      throw new UnauthorizedException('账号或密码错误');
    }
    const r = riders[0];
    if (r.status !== 'active') {
      throw new UnauthorizedException('账号已被禁用');
    }
    if (r.auditStatus !== 'approved') {
      throw new UnauthorizedException('账号审核未通过');
    }
    const valid = bcrypt.compareSync(password, r.password);
    if (!valid) {
      throw new UnauthorizedException('账号或密码错误');
    }
    const token = this.jwtService.sign({ id: r.id, role: 'rider' });
    return {
      token,
      rider: {
        id: r.id,
        account: r.account,
        name: r.name,
        phone: r.phone,
        avatarUrl: r.avatarUrl,
        onlineStatus: r.onlineStatus,
        totalOrders: r.totalOrders,
        rating: String(r.rating),
      },
    };
  }

  async registerRider(account: string, password: string, name: string, phone: string) {
    const existing = await this.db.select().from(rider).where(eq(rider.account, account)).limit(1);
    if (existing.length > 0) {
      throw new ConflictException('账号已注册');
    }
    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = await this.db.insert(rider).values({
      account,
      password: hashedPassword,
      name,
      phone,
      avatarUrl: '',
      idCard: '',
      status: 'active',
      onlineStatus: 'offline',
      auditStatus: 'approved',
      auditReason: '',
    }).returning({ id: rider.id, account: rider.account, name: rider.name, phone: rider.phone });
    const r = result[0];
    const token = this.jwtService.sign({ id: r.id, role: 'rider' });
    return {
      token,
      rider: {
        id: r.id,
        account: r.account,
        name: r.name,
        phone: r.phone,
        avatarUrl: '',
        onlineStatus: 'offline',
        totalOrders: 0,
        rating: '5.0',
      },
    };
  }
}
