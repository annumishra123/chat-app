# Chat App

Chat app with group chats. Node.js + TypeScript backend, React frontend.

- **PostgreSQL**: users, chats, chat members
- **Firebase Firestore**: messages, read receipts, last seen

## Setup


1. Put your Firebase service account key in `backend/serviceAccountKey.json`
   and set `FIREBASE_PROJECT_ID` and `FIREBASE_SERVICE_ACCOUNT_PATH` in `backend/.env`
2. Backend:
   cd backend && npm install && npm run dev
3. Frontend:
   cd frontend && npm install && npm run dev

App runs on http://localhost:5173, API on http://localhost:4000.

## API

| Method | Path | Body |
|---|---|---|
| POST | /chat/create | userAId, userBId |
| POST | /chat/:chatId/message/send | senderId, text |
| GET | /chat/:chatId/messages?limit=50 | |
| POST | /chat/:chatId/message/:messageId/read | userId |
| POST | /chat/:chatId/lastseen | userId, messageId |
| GET | /user/:userId/chats | |

Extra: group chats (`POST /chat/group`, add/remove members, rename), and edit/delete messages.

## Notes

- One chat per pair of users (unique key in Postgres).
- Messages are ordered by Firestore server timestamp.
- Deleting a message is a soft delete.
- No auth yet user ids are sent in the request body.# chat-app
