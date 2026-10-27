import fs from 'node:fs';
import path from 'node:path';
import { pool } from './pool';

export async function ensureSchema(): Promise<void> {
  const sql = fs.readFileSync(path.join(__dirname, '../../sql/schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('Database tables ready');
}