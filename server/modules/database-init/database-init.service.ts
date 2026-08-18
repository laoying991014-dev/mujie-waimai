import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import postgres from 'postgres';

@Injectable()
export class DatabaseInitService implements OnModuleInit {
  private readonly logger = new Logger('DatabaseInit');

  async onModuleInit() {
    if (process.env.FORCE_FRAMEWORK_DISABLE_DATAPASS !== 'true') { this.logger.log('非自建模式，跳过数据库初始化'); return; }
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) { this.logger.warn('DATABASE_URL 未设置，跳过初始化'); return; }
    const sql = postgres(databaseUrl);
    try {
      const result = await sql`SELECT COUNT(*)::int as count FROM information_schema.tables WHERE table_name = 'merchant'`;
      const tableExists = result[0]?.count > 0;
      if (!tableExists) {
        this.logger.log('merchant 表不存在，开始初始化数据库...');
        this.executeSqlFileWithPsql(databaseUrl, '01_schema.sql');
        this.executeSqlFileWithPsql(databaseUrl, '02_seed_data.sql');
        this.executeSqlFileWithPsql(databaseUrl, '03_seed_extra.sql');
        this.logger.log('数据库初始化完成！');
      } else {
        const countResult = await sql`SELECT COUNT(*)::int as count FROM merchant`;
        const merchantCount = countResult[0]?.count ?? 0;
        this.logger.log(`当前商家数量: ${merchantCount}`);
        if (merchantCount === 0) {
          this.logger.log('商家表为空，重新初始化种子数据...');
          this.executeSqlFileWithPsql(databaseUrl, '02_seed_data.sql');
          this.executeSqlFileWithPsql(databaseUrl, '03_seed_extra.sql');
          this.logger.log('种子数据初始化完成！');
        } else {
          this.logger.log('数据库已有数据，跳过初始化');
        }
      }
      // 幂等迁移：已有数据库也会执行，确保支付核实所需表存在。
      this.executeSqlFileWithPsql(databaseUrl, '06_payment_verification.sql');
      // 幂等迁移：为每个商家增加独立收款人姓名和手机号。
      this.executeSqlFileWithPsql(databaseUrl, '07_merchant_payment_settings.sql');
    } catch (error) {
      this.logger.error('数据库初始化失败', error);
    } finally { await sql.end(); }
  }

  private executeSqlFileWithPsql(databaseUrl: string, filename: string) {
    const possiblePaths = [join(process.cwd(), 'deploy', 'sql', filename), join(process.cwd(), 'dist', 'deploy', 'sql', filename), '/app/deploy/sql/' + filename];
    let filePath: string | null = null;
    for (const path of possiblePaths) { try { readFileSync(path); filePath = path; break; } catch { /* try next */ } }
    if (!filePath) { this.logger.warn(`未找到 SQL 文件: ${filename}`); return; }
    this.logger.log(`用 psql 执行: ${filePath}`);
    try {
      const output = execSync(`psql "${databaseUrl}" -f "${filePath}" 2>&1`, { encoding: 'utf-8', timeout: 30000 });
      this.logger.log(`psql 执行成功: ${output.split('\n').filter(l => l.trim()).slice(-3).join(' | ')}`);
    } catch (error: any) {
      this.logger.error(`psql 执行失败: ${error.message?.split('\n')[0]}`);
      if (error.stdout) this.logger.error(`输出: ${error.stdout.substring(0, 500)}`);
    }
  }
}
