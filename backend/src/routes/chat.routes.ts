import { Router } from 'express';
import { z } from 'zod';
import { handler } from '../lib/http';
import * as chats from '../services/chat.service';
import * as messages from '../services/message.service';

const uuid = z.string().uuid();
const messageId = z.string().min(1).max(128);
const text = z.string().trim().min(1, 'Message cannot be empty').max(4000);

export const chatRouter = Router();

// 1. Create or Get Chat
chatRouter.post('/create', handler(async (req, res) => {
  const { userAId, userBId } = z.object({ userAId: uuid, userBId: uuid }).parse(req.body);
  const { chatId, created } = await chats.createOrGetDirectChat(userAId, userBId);
  res.status(created ? 201 : 200).json({ chatId, created });
}));

//  create group
chatRouter.post('/group', handler(async (req, res) => {
  const body = z.object({
    name: z.string().trim().min(1).max(100),
    creatorId: uuid,
    memberIds: z.array(uuid).min(1).max(100),
  }).parse(req.body);
  const chatId = await chats.createGroupChat(body.name, body.creatorId, body.memberIds);
  res.status(201).json({ chatId });
}));

chatRouter.get('/:chatId', handler(async (req, res) => {
  const chatId = uuid.parse(req.params.chatId);
  const [chat, members, lastSeen] = await Promise.all([
    chats.getChat(chatId),
    chats.getMembers(chatId),
    messages.getLastSeenStates(chatId),
  ]);
  res.json({ chat: { id: chat.id, type: chat.type, name: chat.name, createdAt: chat.created_at }, members, lastSeen });
}));

// group management
chatRouter.patch('/:chatId', handler(async (req, res) => {
  const chatId = uuid.parse(req.params.chatId);
  const { requesterId, name } = z.object({ requesterId: uuid, name: z.string().trim().min(1).max(100) }).parse(req.body);
  await chats.renameGroup(chatId, requesterId, name);
  res.json({ ok: true });
}));

chatRouter.post('/:chatId/members', handler(async (req, res) => {
  const chatId = uuid.parse(req.params.chatId);
  const { requesterId, userId } = z.object({ requesterId: uuid, userId: uuid }).parse(req.body);
  await chats.addGroupMember(chatId, requesterId, userId);
  res.status(201).json({ ok: true });
}));

chatRouter.delete('/:chatId/members/:userId', handler(async (req, res) => {
  const chatId = uuid.parse(req.params.chatId);
  const userId = uuid.parse(req.params.userId);
  const requesterId = uuid.parse(req.query.requesterId);
  await chats.removeGroupMember(chatId, requesterId, userId);
  res.json({ ok: true });
}));

// 2. Send Message
chatRouter.post('/:chatId/message/send', handler(async (req, res) => {
  const chatId = uuid.parse(req.params.chatId);
  const { senderId, text: body } = z.object({ senderId: uuid, text }).parse(req.body);
  res.status(201).json({ message: await messages.sendMessage(chatId, senderId, body) });
}));

// 3. Get Messages
chatRouter.get('/:chatId/messages', handler(async (req, res) => {
  const chatId = uuid.parse(req.params.chatId);
  const q = z.object({
    limit: z.coerce.number().int().min(1).max(200).default(50),
    before: z.string().datetime().optional(),
  }).parse(req.query);
  res.json({ messages: await messages.getMessages(chatId, q.limit, q.before) });
}));

// 4. Mark Message Read
chatRouter.post('/:chatId/message/:messageId/read', handler(async (req, res) => {
  const chatId = uuid.parse(req.params.chatId);
  const { userId } = z.object({ userId: uuid }).parse(req.body);
  res.json({ message: await messages.markRead(chatId, messageId.parse(req.params.messageId), userId) });
}));

//  edit / delete message
chatRouter.patch('/:chatId/message/:messageId', handler(async (req, res) => {
  const chatId = uuid.parse(req.params.chatId);
  const { userId, text: body } = z.object({ userId: uuid, text }).parse(req.body);
  res.json({ message: await messages.editMessage(chatId, messageId.parse(req.params.messageId), userId, body) });
}));

chatRouter.delete('/:chatId/message/:messageId', handler(async (req, res) => {
  const chatId = uuid.parse(req.params.chatId);
  const userId = uuid.parse(req.query.userId);
  res.json({ message: await messages.deleteMessage(chatId, messageId.parse(req.params.messageId), userId) });
}));

// 5. Update Last Seen Message
chatRouter.post('/:chatId/lastseen', handler(async (req, res) => {
  const chatId = uuid.parse(req.params.chatId);
  const { userId, messageId: mid } = z.object({ userId: uuid, messageId }).parse(req.body);
  res.json({ lastSeen: await messages.updateLastSeen(chatId, userId, mid) });
}));
