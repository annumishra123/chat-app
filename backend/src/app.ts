import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler, notFound } from './middleware/errorHandler';
import { chatRouter } from './routes/chat.routes';
import { userRouter } from './routes/user.routes';

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN.split(',') }));
app.use(express.json({ limit: '100kb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});
app.use('/chat', chatRouter);
app.use('/', userRouter);

app.use(notFound);
app.use(errorHandler);
