import { pool, tx } from '../db/pool';
import { HttpError } from '../lib/errors';
import type { ChatMember, ChatRow, ChatSummary, MemberRole } from '../types';
import { assertUsersExist } from './user.service';

/* ------------------------------ lookups ------------------------------ */

export async function getChat(chatId: string): Promise<ChatRow> {
  const r = await pool.query<ChatRow>('SELECT id, type, name, created_by, created_at FROM chats WHERE id = $1', [chatId]);
  if (!r.rows[0]) throw new HttpError(404, 'Chat not found');
  return r.rows[0];
}

export async function assertMember(chatId: string, userId: string): Promise<MemberRole> {
  await getChat(chatId);
  const r = await pool.query<{ role: MemberRole }>('SELECT role FROM chat_members WHERE chat_id = $1 AND user_id = $2', [
    chatId,
    userId,
  ]);
  if (!r.rows[0]) throw new HttpError(403, 'User is not a member of this chat');
  return r.rows[0].role;
}

export async function getMembers(chatId: string): Promise<ChatMember[]> {
  const r = await pool.query<ChatMember>(
    `SELECT u.id, u.name, m.role
       FROM chat_members m JOIN users u ON u.id = m.user_id
      WHERE m.chat_id = $1 ORDER BY m.joined_at`,
    [chatId],
  );
  return r.rows;
}

/* --------------------------- 1:1 chats (core) --------------------------- */

/** Idempotent: the same pair of users always resolves to the same chat. */
export async function createOrGetDirectChat(userAId: string, userBId: string): Promise<{ chatId: string; created: boolean }> {
  if (userAId === userBId) throw new HttpError(400, 'You cannot start a chat with yourself');
  await assertUsersExist([userAId, userBId]);
  const directKey = [userAId, userBId].sort().join(':');

  return tx(async (c) => {
    const inserted = await c.query<{ id: string }>(
      `INSERT INTO chats(type, direct_key, created_by) VALUES ('direct', $1, $2)
       ON CONFLICT (direct_key) DO NOTHING RETURNING id`,
      [directKey, userAId],
    );
    const row = inserted.rows[0];
    if (row) {
      await c.query(`INSERT INTO chat_members(chat_id, user_id) SELECT $1::uuid, unnest($2::uuid[])`, [
        row.id,
        [userAId, userBId],
      ]);
      return { chatId: row.id, created: true };
    }
    const existing = await c.query<{ id: string }>('SELECT id FROM chats WHERE direct_key = $1', [directKey]);
    return { chatId: (existing.rows[0] as { id: string }).id, created: false };
  });
}

/* ----------------------------- list chats ------------------------------ */

interface ListRow {
  id: string;
  type: ChatRow['type'];
  name: string | null;
  created_at: Date;
  members: ChatMember[];
}

export async function listUserChats(userId: string): Promise<ChatSummary[]> {
  const r = await pool.query<ListRow>(
    `SELECT c.id, c.type, c.name, c.created_at,
            json_agg(json_build_object('id', u.id, 'name', u.name, 'role', m2.role) ORDER BY m2.joined_at) AS members
       FROM chat_members me
       JOIN chats c         ON c.id = me.chat_id
       JOIN chat_members m2 ON m2.chat_id = c.id
       JOIN users u         ON u.id = m2.user_id
      WHERE me.user_id = $1
      GROUP BY c.id`,
    [userId],
  );
  return r.rows.map((row) => ({
    id: row.id,
    type: row.type,
    name: row.name,
    createdAt: row.created_at,
    members: row.members,
    memberIds: row.members.map((m) => m.id),
  }));
}

/* --------------------------- group chats  --------------------------- */

export async function createGroupChat(name: string, creatorId: string, memberIds: string[]): Promise<string> {
  const ids = [...new Set([creatorId, ...memberIds])];
  if (ids.length < 2) throw new HttpError(400, 'A group needs at least 2 members');
  await assertUsersExist(ids);

  return tx(async (c) => {
    const r = await c.query<{ id: string }>(`INSERT INTO chats(type, name, created_by) VALUES ('group', $1, $2) RETURNING id`, [
      name,
      creatorId,
    ]);
    const chatId = (r.rows[0] as { id: string }).id;
    await c.query(
      `INSERT INTO chat_members(chat_id, user_id, role)
       SELECT $1::uuid, u, CASE WHEN u = $2::uuid THEN 'admin' ELSE 'member' END
         FROM unnest($3::uuid[]) AS u`,
      [chatId, creatorId, ids],
    );
    return chatId;
  });
}

async function assertGroupAdmin(chatId: string, requesterId: string): Promise<void> {
  const chat = await getChat(chatId);
  if (chat.type !== 'group') throw new HttpError(400, 'This action is only available for group chats');
  const role = await assertMember(chatId, requesterId);
  if (role !== 'admin') throw new HttpError(403, 'Only group admins can do this');
}

export async function renameGroup(chatId: string, requesterId: string, name: string): Promise<void> {
  await assertGroupAdmin(chatId, requesterId);
  await pool.query('UPDATE chats SET name = $1 WHERE id = $2', [name, chatId]);
}

export async function addGroupMember(chatId: string, requesterId: string, userId: string): Promise<void> {
  await assertGroupAdmin(chatId, requesterId);
  await assertUsersExist([userId]);
  await pool.query('INSERT INTO chat_members(chat_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [chatId, userId]);
}

/** Admins can remove anyone any member can remove . */
export async function removeGroupMember(chatId: string, requesterId: string, userId: string): Promise<void> {
  const chat = await getChat(chatId);
  if (chat.type !== 'group') throw new HttpError(400, 'This action is only available for group chats');
  if (requesterId === userId) await assertMember(chatId, requesterId);
  else await assertGroupAdmin(chatId, requesterId);

  await tx(async (c) => {
    const del = await c.query('DELETE FROM chat_members WHERE chat_id = $1 AND user_id = $2', [chatId, userId]);
    if (del.rowCount === 0) throw new HttpError(404, 'User is not a member of this group');
    await c.query(
      `UPDATE chat_members SET role = 'admin'
        WHERE chat_id = $1
          AND user_id = (SELECT user_id FROM chat_members WHERE chat_id = $1 ORDER BY joined_at LIMIT 1)
          AND NOT EXISTS (SELECT 1 FROM chat_members WHERE chat_id = $1 AND role = 'admin')`,
      [chatId],
    );
  });
}
