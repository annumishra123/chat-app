export interface User { id: string; name: string; email: string }
export interface ChatMember { id: string; name: string; role: 'admin' | 'member' }

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: string | null;
  editedAt: string | null;
  deleted: boolean;
  readBy: Record<string, string>;
}

export interface ChatSummary {
  id: string;
  type: 'direct' | 'group';
  name: string | null;
  createdAt: string;
  memberIds: string[];
  members: ChatMember[];
  lastMessage: Message | null;
}
