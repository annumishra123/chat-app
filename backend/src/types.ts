export type ChatType = 'direct' | 'group';
export type MemberRole = 'admin' | 'member';

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface ChatMember {
  id: string;
  name: string;
  role: MemberRole;
}

export interface ChatRow {
  id: string;
  type: ChatType;
  name: string | null;
  created_by: string | null;
  created_at: Date;
}

/** A message as stored in Firestore: chats/{chatId}/messages/{messageId} */
export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: string | null;
  editedAt: string | null;
  deleted: boolean;
  /** userId -> ISO time the user read this message */
  readBy: Record<string, string>;
}

export interface ChatSummary {
  id: string;
  type: ChatType;
  name: string | null;
  createdAt: Date;
  memberIds: string[];
  members: ChatMember[];
  lastMessage?: Message | null;
}
