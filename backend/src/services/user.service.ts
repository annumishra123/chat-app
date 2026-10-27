import { pool } from '../db/pool';
import { HttpError } from '../lib/errors';
import type { User } from '../types';

export async function createUser(name: string, email: string): Promise<User> {
  const r = await pool.query<User>('INSERT INTO users(name, email) VALUES($1, $2) RETURNING id, name, email', [
    name,
    email.toLowerCase(),
  ]);
  return r.rows[0] as User;
}

export async function listUsers(): Promise<User[]> {
  const r = await pool.query<User>('SELECT id, name, email FROM users ORDER BY name');
  return r.rows;
}

export async function assertUsersExist(ids: string[]): Promise<void> {
  const unique = [...new Set(ids)];
  const r = await pool.query<{ count: string }>('SELECT count(*) FROM users WHERE id = ANY($1::uuid[])', [unique]);
  if (Number(r.rows[0]?.count) !== unique.length) throw new HttpError(404, 'One or more users do not exist');
}
