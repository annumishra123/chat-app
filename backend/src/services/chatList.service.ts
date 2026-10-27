import type { ChatSummary } from '../types';
import { listUserChats } from './chat.service';
import { getLastMessage } from './message.service';

/** members from the relational DB the latest message from Firestore. */
export async function listUserChatsWithPreview(userId: string): Promise<ChatSummary[]> {
  const chats = await listUserChats(userId);
  const withPreview = await Promise.all(chats.map(async (c) => ({ ...c, lastMessage: await getLastMessage(c.id) })));
  const activity = (c: ChatSummary) => new Date(c.lastMessage?.createdAt ?? c.createdAt).getTime();
  return withPreview.sort((a, b) => activity(b) - activity(a));
}
