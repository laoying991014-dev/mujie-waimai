import { Global, Module } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/postgres-js';
// eslint-disable-next-line import/no-extraneous-dependencies
import postgres from 'postgres';
import { DRIZZLE_DATABASE } from '@lark-apaas/fullstack-nestjs-core';
import type { PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';

function isSelfhostMode(): boolean {
  return (
    process.env.FORCE_FRAMEWORK_DISABLE_DATAPASS === 'true' &&
    !!process.env.DATABASE_URL
  );
}

const providers = isSelfhostMode()
  ? [
      {
        provide: DRIZZLE_DATABASE,
        useFactory: (): PostgresJsDatabase => {
          const sql = postgres(process.env.DATABASE_URL!);
          return drizzle(sql) as unknown as PostgresJsDatabase;
        },
      },
    ]
  : [];

@Global()
@Module({
  providers,
  exports: providers.map((p) => p.provide),
})
export class SelfhostDatabaseModule {}
