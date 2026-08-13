import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import postgres from 'postgres';

@Injectable()
export class DatabaseInitService implements OnModuleInit {
  private readonly logger = new Logger('DatabaseInit');

  async onModuleInit() {
    if (process.env.FORCE_FRAMEWORK_DISABLE_DATAPASS !== 'true') {
      this.logger.log('非自建模式，跳过数据库初始化');
      return;
    }

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      this.logger.warn('DATABASE_URL 未设置，跳过初始化');
      return;
    }

    const sql = postgres(databaseUrl);

    try {
      // 检查 merchant 表是否有数据
      const result = await sql`
        SELECT COUNT(*)::int as count FROM information_schema.tables 
        WHERE table_name = 'merchant'
      `;
      const tableExists = result[0]?.count > 0;

      if (!tableExists) {
        this.logger.log('merchant 表不存在，开始初始化数据库...');
        await this.executeSqlFile(sql, '01_schema.sql');
        await this.executeSqlFile(sql, '02_seed_data.sql');
        await this.executeSqlFile(sql, '03_seed_extra.sql');
        this.logger.log('数据库初始化完成！');
      } else {
        // 表存在，检查是否有数据
        const countResult = await sql`SELECT COUNT(*)::int as count FROM merchant`;
        const merchantCount = countResult[0]?.count ?? 0;
        this.logger.log(`当前商家数量: ${merchantCount}`);

        if (merchantCount === 0) {
          this.logger.log('商家表为空，重新初始化种子数据...');
          await this.executeSqlFile(sql, '02_seed_data.sql');
          await this.executeSqlFile(sql, '03_seed_extra.sql');
          this.logger.log('种子数据初始化完成！');
        } else {
          this.logger.log('数据库已有数据，跳过初始化');
        }
      }
    } catch (error) {
      this.logger.error('数据库初始化失败', error);
    } finally {
      await sql.end();
    }
  }

  private async executeSqlFile(sql: postgres.Sql, filename: string) {
    const possiblePaths = [
      join(process.cwd(), 'deploy', 'sql', filename),
      join(process.cwd(), 'dist', 'deploy', 'sql', filename),
      '/app/deploy/sql/' + filename,
    ];

    let content: string | null = null;
    for (const path of possiblePaths) {
      try {
        content = readFileSync(path, 'utf-8');
        this.logger.log(`读取 SQL 文件: ${path}`);
        break;
      } catch {
        // 尝试下一个路径
      }
    }

    if (!content) {
      this.logger.warn(`未找到 SQL 文件: ${filename}`);
      return;
    }

    // 按行拼接语句，直到遇到以分号结尾的行
    const lines = content.split('\n');
    const statements: string[] = [];
    let currentStatement = '';

    for (const line of lines) {
      const trimmed = line.trim();
      // 跳过注释行和空行
      if (!trimmed || trimmed.startsWith('--')) {
        continue;
      }
      currentStatement += line + '\n';
      // 如果行以分号结尾，说明语句结束
      if (trimmed.endsWith(';')) {
        statements.push(currentStatement.trim());
        currentStatement = '';
      }
    }

    // 处理最后一条没有换行的语句
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }

    this.logger.log(`共解析到 ${statements.length} 条 SQL 语句`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        await sql.unsafe(statement);
        this.logger.debug(`执行第 ${i + 1} 条语句成功`);
      } catch (error: any) {
        // 忽略 "already exists" 类错误（表已存在等）
        if (error?.message?.includes('already exists') || error?.message?.includes('duplicate key')) {
          this.logger.debug(`跳过第 ${i + 1} 条: ${error.message.split('\n')[0]}`);
        } else {
          this.logger.error(`第 ${i + 1} 条语句执行失败: ${error.message?.split('\n')[0]}`);
          this.logger.error(`语句内容前100字符: ${statement.substring(0, 100)}`);
        }
      }
    }
  }
}
