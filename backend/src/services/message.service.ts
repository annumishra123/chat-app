import { FieldPath, FieldValue, Timestamp, type DocumentData, type DocumentSnapshot } from 'firebase-admin/firestore';
import { firestore } from '../config/firebase';
import { HttpError } from '../lib/errors';
import type { Message } from '../types';
import { assertMember, getChat } from './chat.service';

/**
 * Firestore layout
 *   chats/{chatId}/messages/{messageId}  -> { senderId, text, createdAt, editedAt, deleted, readBy: { [userId]: Timestamp } }
 *   chats/{chatId}/members/{userId}      -> { lastSeenMessageId, lastSeenAt }
 */
const messagesCol = (chatId: string) => firestore.collection('chats').doc(chatId).collection('messages');
const memberStateDoc = (chatId: string, userId: string) =>
  firestore.collection('chats').doc(chatId).collection('members').doc(userId);

const iso = (v: unknown): string | null => (v instanceof Timestamp ? v.toDate().toISOString() : null);

function toMessage(chatId: string, doc: DocumentSnapshot<DocumentData>): Message {
  const d = doc.data() ?? {};
  const rawReadBy = (d.readBy ?? {}) as Record<string, unknown>;
  const readBy: Record<string, string> = {};
  for (const [uid, ts] of Object.entries(rawReadBy)) {
    const t = iso(ts);
    if (t) readBy[uid] = t;
  }
  const deleted = d.deleted === true;
  return {
    id: doc.id,
    chatId,
    senderId: String(d.senderId),
    text: deleted ? '' : String(d.text ?? ''),
    createdAt: iso(d.createdAt),
    editedAt: iso(d.editedAt),
    deleted,
    readBy,
  };
}

async function getMessageDoc(chatId: string, messageId: string) {
  const snap = await messagesCol(chatId).doc(messageId).get();
  if (!snap.exists) throw new HttpError(404, 'Message not found');
  return snap;
}

/* ------------------------------- send / read ------------------------------- */

export async function sendMessage(chatId: string, senderId: string, text: string): Promise<Message> {
  await assertMember(chatId, senderId);
  const ref = messagesCol(chatId).doc();
  await ref.set({
    senderId,
    text,
    createdAt: FieldValue.serverTimestamp(), // server-side clock => consistent ordering
    editedAt: null,
    deleted: false,
    readBy: {},
  });
  return toMessage(chatId, await ref.get());
}

/** Newest messages returned  */
export async function getMessages(chatId: string, limit: number, before?: string): Promise<Message[]> {
  await getChat(chatId);
  let q = messagesCol(chatId).orderBy('createdAt', 'desc').limit(limit);
  if (before) q = q.startAfter(Timestamp.fromDate(new Date(before)));
  const snap = await q.get();
  return snap.docs.map((d) => toMessage(chatId, d)).reverse();
}

export async function getLastMessage(chatId: string): Promise<Message | null> {
  const snap = await messagesCol(chatId).orderBy('createdAt', 'desc').limit(1).get();
  const doc = snap.docs[0];
  return doc ? toMessage(chatId, doc) : null;
}

export async function markRead(chatId: string, messageId: string, userId: string): Promise<Message> {
  await assertMember(chatId, userId);
  const snap = await getMessageDoc(chatId, messageId);
  const msg = toMessage(chatId, snap);
  if (msg.senderId === userId || msg.readBy[userId]) return msg;

  await snap.ref.update(new FieldPath('readBy', userId), FieldValue.serverTimestamp());
  return toMessage(chatId, await snap.ref.get());
}

export async function updateLastSeen(chatId: string, userId: string, messageId: string) {
  await assertMember(chatId, userId);
  await getMessageDoc(chatId, messageId);
  const ref = memberStateDoc(chatId, userId);
  await ref.set({ lastSeenMessageId: messageId, lastSeenAt: FieldValue.serverTimestamp() }, { merge: true });
  const d = (await ref.get()).data() ?? {};
  return { userId, lastSeenMessageId: String(d.lastSeenMessageId), lastSeenAt: iso(d.lastSeenAt) };
}

export async function getLastSeenStates(chatId: string) {
  await getChat(chatId);
  const snap = await firestore.collection('chats').doc(chatId).collection('members').get();
  return snap.docs.map((doc) => {
    const d = doc.data();
    return { userId: doc.id, lastSeenMessageId: String(d.lastSeenMessageId), lastSeenAt: iso(d.lastSeenAt) };
  });
}

/* ---------------------------- edit / delete  ---------------------------- */

export async function editMessage(chatId: string, messageId: string, userId: string, text: string): Promise<Message> {
  await assertMember(chatId, userId);
  const snap = await getMessageDoc(chatId, messageId);
  const msg = toMessage(chatId, snap);
  if (msg.senderId !== userId) throw new HttpError(403, 'You can only edit your own messages');
  if (msg.deleted) throw new HttpError(400, 'Deleted messages cannot be edited');
  await snap.ref.update({ text, editedAt: FieldValue.serverTimestamp() });
  return toMessage(chatId, await snap.ref.get());
}

/** Soft delete. */
export async function deleteMessage(chatId: string, messageId: string, userId: string): Promise<Message> {
  await assertMember(chatId, userId);
  const snap = await getMessageDoc(chatId, messageId);
  if (toMessage(chatId, snap).senderId !== userId) throw new HttpError(403, 'You can only delete your own messages');
  await snap.ref.update({ deleted: true, text: '', editedAt: FieldValue.serverTimestamp() });
  return toMessage(chatId, await snap.ref.get());
}
