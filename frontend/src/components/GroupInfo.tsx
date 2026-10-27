import { useEffect, useState } from 'react';
import { api } from '../api';
import { initials } from '../lib';
import type { ChatSummary, User } from '../types';

interface Props { chat: ChatSummary; me: User; onClose: () => void; onChanged: () => void }

export function GroupInfo({ chat, me, onClose, onChanged }: Props) {
  const [name, setName] = useState(chat.name ?? '');
  const [candidates, setCandidates] = useState<User[]>([]);
  const [error, setError] = useState('');
  const isAdmin = chat.members.find((m) => m.id === me.id)?.role === 'admin';

  useEffect(() => {
    api.listUsers().then((all) => setCandidates(all.filter((u) => !chat.memberIds.includes(u.id)))).catch(() => undefined);
  }, [chat.memberIds]);

  const act = async (fn: () => Promise<unknown>, closeAfter = false) => {
    setError('');
    try {
      await fn();
      onChanged();
      if (closeAfter) onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <aside className="info">
      <header>
        <h3>Group info</h3>
        <button className="link" onClick={onClose}>Close</button>
      </header>

      {isAdmin && (
        <div className="info-block">
          <label htmlFor="gname">Group name</label>
          <div className="inline">
            <input id="gname" value={name} onChange={(e) => setName(e.target.value)} />
            <button className="btn" disabled={!name.trim() || name === chat.name} onClick={() => act(() => api.renameGroup(chat.id, me.id, name.trim()))}>Save</button>
          </div>
        </div>
      )}

      <div className="info-block">
        <label>{chat.members.length} members</label>
        <ul className="user-list">
          {chat.members.map((m) => (
            <li key={m.id} className="user-row static">
              <span className="avatar">{initials(m.name)}</span>
              <span className="grow"><strong>{m.id === me.id ? `${m.name} (you)` : m.name}</strong><small>{m.role}</small></span>
              {isAdmin && m.id !== me.id && (
                <button className="link danger" onClick={() => act(() => api.removeMember(chat.id, me.id, m.id))}>Remove</button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {isAdmin && candidates.length > 0 && (
        <div className="info-block">
          <label>Add people</label>
          <ul className="user-list">
            {candidates.map((u) => (
              <li key={u.id} className="user-row static">
                <span className="avatar">{initials(u.name)}</span>
                <span className="grow"><strong>{u.name}</strong></span>
                <button className="link" onClick={() => act(() => api.addMember(chat.id, me.id, u.id))}>Add</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button className="btn danger-btn" onClick={() => act(() => api.removeMember(chat.id, me.id, me.id), true)}>Leave group</button>
      {error && <p className="error">{error}</p>}
    </aside>
  );
}
