import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { api } from '../api';
import { chatTitle, formatDay, formatTime, initials, usePolling } from '../lib';
import type { ChatSummary, Message, User } from '../types';
import { GroupInfo } from './GroupInfo';

interface Props { chat: ChatSummary; me: User; onChanged: () => void; onBack: () => void }

export function ChatWindow({ chat, me, onChanged, onBack }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [editing, setEditing] = useState<Message | null>(null);
  const [error, setError] = useState('');
  const [showInfo, setShowInfo] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const acked = useRef(new Set<string>());
  const lastSeenSent = useRef<string | null>(null);

  const others = chat.members.filter((m) => m.id !== me.id);
  const nameOf = (id: string) => chat.members.find((m) => m.id === id)?.name ?? 'Former member';

  const load = useCallback(async () => {
    const list = await api.getMessages(chat.id, 100);
    setMessages(list);

    const unread = list.filter((m) => m.senderId !== me.id && !m.deleted && !m.readBy[me.id] && !acked.current.has(m.id));
    unread.forEach((m) => acked.current.add(m.id));
    await Promise.all(unread.map((m) => api.markRead(chat.id, m.id, me.id)));

    // Last seen message per user.
    const last = list[list.length - 1];
    if (last && lastSeenSent.current !== last.id) {
      lastSeenSent.current = last.id;
      await api.updateLastSeen(chat.id, me.id, last.id);
    }
  }, [chat.id, me.id]);

  usePolling(load, 2500, [chat.id, me.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, chat.id]);

  const submit = async () => {
    const value = text.trim();
    if (!value) return;
    setError('');
    try {
      if (editing) {
        await api.editMessage(chat.id, editing.id, me.id, value);
        setEditing(null);
      } else {
        await api.sendMessage(chat.id, me.id, value);
      }
      setText('');
      await load();
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const remove = async (m: Message) => {
    try {
      await api.deleteMessage(chat.id, m.id, me.id);
      await load();
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
    if (e.key === 'Escape' && editing) {
      setEditing(null);
      setText('');
    }
  };

  const receipt = (m: Message): string => {
    const readers = others.filter((o) => m.readBy[o.id]).length;
    if (readers === 0) return 'Sent';
    return readers === others.length ? 'Read' : `Read by ${readers}`;
  };

  const title = chatTitle(chat, me.id);

  return (
    <section className="chat">
      <header className="chat-head">
        <button className="link back" onClick={onBack}>Back</button>
        <span className={`avatar ${chat.type === 'group' ? 'square' : ''}`}>{initials(title)}</span>
        <div className="grow">
          <strong>{title}</strong>
          <small>{chat.type === 'group' ? chat.members.map((m) => m.name.split(' ')[0]).join(', ') : others[0]?.name ? 'Direct message' : ''}</small>
        </div>
        {chat.type === 'group' && <button className="btn ghost" onClick={() => setShowInfo((v) => !v)}>Group info</button>}
      </header>

      <div className="chat-body">
        <div className="messages">
          {messages.length === 0 && <p className="muted center">No messages yet. Say hello.</p>}
          {messages.map((m, i) => {
            const mine = m.senderId === me.id;
            const newDay = i === 0 || formatDay(messages[i - 1]?.createdAt ?? null) !== formatDay(m.createdAt);
            return (
              <div key={m.id}>
                {newDay && <div className="day">{formatDay(m.createdAt)}</div>}
                <div className={`msg ${mine ? 'mine' : 'theirs'}`}>
                  <div className={`bubble ${m.deleted ? 'deleted' : ''}`}>
                    {chat.type === 'group' && !mine && <span className="sender">{nameOf(m.senderId)}</span>}
                    <span className="text">{m.deleted ? 'This message was deleted' : m.text}</span>
                    <span className="meta">
                      {m.editedAt && !m.deleted && 'edited · '}
                      {formatTime(m.createdAt)}
                      {mine && !m.deleted && <b className={receipt(m).startsWith('Read') ? 'read' : ''}> · {receipt(m)}</b>}
                    </span>
                  </div>
                  {mine && !m.deleted && (
                    <div className="msg-actions">
                      <button className="link" onClick={() => { setEditing(m); setText(m.text); }}>Edit</button>
                      <button className="link danger" onClick={() => remove(m)}>Delete</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        {showInfo && chat.type === 'group' && <GroupInfo chat={chat} me={me} onClose={() => setShowInfo(false)} onChanged={onChanged} />}
      </div>

      {error && <p className="error bar">{error}</p>}
      {editing && (
        <div className="editing">
          Editing message <button className="link" onClick={() => { setEditing(null); setText(''); }}>Cancel</button>
        </div>
      )}
      <footer className="composer">
        <textarea rows={1} placeholder="Write a message" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} />
        <button className="btn" disabled={!text.trim()} onClick={submit}>{editing ? 'Save edit' : 'Send'}</button>
      </footer>
    </section>
  );
}
