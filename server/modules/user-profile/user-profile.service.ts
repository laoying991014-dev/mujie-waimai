import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq } from 'drizzle-orm';
import type { UserProfile } from '@shared/api.interface';
import { appUser } from '../../database/schema';

@Injectable()
export class UserProfileService {
  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async getProfile(userId: string): Promise<UserProfile> {
    const rows = await this.db
      .select({
        id: appUser.id,
        phone: appUser.phone,
        nickname: appUser.nickname,
        avatarUrl: appUser.avatarUrl,
      })
      .from(appUser)
      .where(eq(appUser.id, userId))
      .limit(1);

    const user = rows[0];
    return {
      id: user.id,
      phone: user.phone,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
    };
  }

  async updateProfile(
    userId: string,
    data: { nickname?: string; avatarUrl?: string },
  ): Promise<UserProfile> {
    const updateData: Record<string, any> = {};
    if (data.nickname !== undefined) updateData.nickname = data.nickname;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;

    const updated = await this.db
      .update(appUser)
      .set(updateData)
      .where(eq(appUser.id, userId))
      .returning({
        id: appUser.id,
        phone: appUser.phone,
        nickname: appUser.nickname,
        avatarUrl: appUser.avatarUrl,
      });

    return {
      id: updated[0].id,
      phone: updated[0].phone,
      nickname: updated[0].nickname,
      avatarUrl: updated[0].avatarUrl,
    };
  }
}
