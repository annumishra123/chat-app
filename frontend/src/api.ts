import type { ChatSummary, Message, User } from './types';

const BASE = import.meta.env.VITE_API_URL ?? '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: { 'Content-Type': 'application/json' }, ...init });
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  if (!res.ok) throw new Error(body?.error ?? `Request failed (${res.status})`);
  return body as T;
}

const post = <T,>(path: string, data: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(data) });
const patch = <T,>(path: string, data: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(data) });

export const api = {
  listUsers: () => request<{ users: User[] }>('/users').then((r) => r.users),
  createUser: (name: string, email: string) => post<{ user: User }>('/users', { name, email }).then((r) => r.user),

  createChat: (userAId: string, userBId: string) => post<{ chatId: string }>('/chat/create', { userAId, userBId }).then((r) => r.chatId),
  createGroup: (name: string, creatorId: string, memberIds: string[]) =>
    post<{ chatId: string }>('/chat/group', { name, creatorId, memberIds }).then((r) => r.chatId),
  listChats: (userId: string) => request<{ chats: ChatSummary[] }>(`/user/${userId}/chats`).then((r) => r.chats),

  getMessages: (chatId: string, limit = 50) =>
    request<{ messages: Message[] }>(`/chat/${chatId}/messages?limit=${limit}`).then((r) => r.messages),
  sendMessage: (chatId: string, senderId: string, text: string) =>
    post<{ message: Message }>(`/chat/${chatId}/message/send`, { senderId, text }).then((r) => r.message),
  markRead: (chatId: string, messageId: string, userId: string) =>
    post<unknown>(`/chat/${chatId}/message/${messageId}/read`, { userId }),
  updateLastSeen: (chatId: string, userId: string, messageId: string) =>
    post<unknown>(`/chat/${chatId}/lastseen`, { userId, messageId }),
  editMessage: (chatId: string, messageId: string, userId: string, text: string) =>
    patch<unknown>(`/chat/${chatId}/message/${messageId}`, { userId, text }),
  deleteMessage: (chatId: string, messageId: string, userId: string) =>
    request<unknown>(`/chat/${chatId}/message/${messageId}?userId=${userId}`, { method: 'DELETE' }),

  renameGroup: (chatId: string, requesterId: string, name: string) => patch<unknown>(`/chat/${chatId}`, { requesterId, name }),
  addMember: (chatId: string, requesterId: string, userId: string) => post<unknown>(`/chat/${chatId}/members`, { requesterId, userId }),
  removeMember: (chatId: string, requesterId: string, userId: string) =>
    request<unknown>(`/chat/${chatId}/members/${userId}?requesterId=${requesterId}`, { method: 'DELETE' }),
};