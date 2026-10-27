import { Router } from 'express';
import { z } from 'zod';
import { handler } from '../lib/http';
import { listUserChatsWithPreview } from '../services/chatList.service';
import { createUser, listUsers } from '../services/user.service';

const uuid = z.string().uuid();
export const userRouter = Router();

userRouter.get('/users', handler(async (_req, res) => {
  res.json({ users: await listUsers() });
}));

userRouter.post('/users', handler(async (req, res) => {
  const { name, email } = z.object({ name: z.string().trim().min(1).max(100), email: z.string().email() }).parse(req.body);
  res.status(201).json({ user: await createUser(name, email) });
}));

// 6. List User Chats
userRouter.get('/user/:userId/chats', handler(async (req, res) => {
  const userId = uuid.parse(req.params.userId);
  res.json({ chats: await listUserChatsWithPreview(userId) });
}));
