import { useState } from 'react';
import { chatTitle, formatTime, initials } from '../lib';
import type { ChatSummary, User } from '../types';
import { NewChatDialog } from './NewChatDialog';

interface Props {
  me: User;
  chats: ChatSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onOpenChat: (id: string) => Promise<void>;
  onSwitchUser: () => void;
}

export function Sidebar({ me, chats, activeId, onSelect, onOpenChat, onSwitchUser }: Props) {
  const [dialog, setDialog] = useState<'direct' | 'group' | null>(null);

  const preview = (c: ChatSummary): string => {
    const m = c.lastMessage;
    if (!m) return 'No messages yet';
    if (m.deleted) return 'Message deleted';
    const who = m.senderId === me.id ? 'You: ' : c.type === 'group' ? `${c.members.find((x) => x.id === m.senderId)?.name.split(' ')[0] ?? ''}: ` : '';
    return who + m.text;
  };

  const unread = (c: ChatSummary): boolean => {
    const m = c.lastMessage;
    return !!m && m.senderId !== me.id && !m.readBy[me.id] && !m.deleted;
  };

  return (
    <aside className="sidebar">
      <header className="side-head">
        <span className="avatar">{initials(me.name)}</span>
        <div className="grow">
          <strong>{me.name}</strong>
          <button className="link" onClick={onSwitchUser}>Switch user</button>
        </div>
      </header>

      <div className="side-actions">
        <button className="btn" onClick={() => setDialog('direct')}>New chat</button>
        <button className="btn ghost" onClick={() => setDialog('group')}>New group</button>
      </div>

      <ul className="chat-list">
        {chats.map((c) => {
          const title = chatTitle(c, me.id);
          return (
            <li key={c.id}>
              <button className={`chat-row ${c.id === activeId ? 'active' : ''}`} onClick={() => onSelect(c.id)}>
                <span className={`avatar ${c.type === 'group' ? 'square' : ''}`}>{initials(title)}</span>
                <span className="grow">
                  <span className="row-top">
                    <strong>{title}</strong>
                    <small>{formatTime(c.lastMessage?.createdAt ?? null)}</small>
                  </span>
                  <span className={`row-preview ${unread(c) ? 'unread' : ''}`}>{preview(c)}</span>
                </span>
                {unread(c) && <span className="dot" aria-label="Unread" />}
              </button>
            </li>
          );
        })}
        {chats.length === 0 && <li className="muted pad">No chats yet. Start one with “New chat”.</li>}
      </ul>

      {dialog && <NewChatDialog mode={dialog} me={me} onClose={() => setDialog(null)} onCreated={onOpenChat} />}
    </aside>
  );
}
