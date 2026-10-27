import { useEffect, useState } from 'react';
import { api } from '../api';
import { initials } from '../lib';
import type { User } from '../types';

interface Props {
  mode: 'direct' | 'group';
  me: User;
  onClose: () => void;
  onCreated: (chatId: string) => Promise<void>;
}

export function NewChatDialog({ mode, me, onClose, onCreated }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.listUsers().then((all) => setUsers(all.filter((u) => u.id !== me.id))).catch((e: Error) => setError(e.message));
  }, [me.id]);

  const run = async (fn: () => Promise<string>) => {
    try {
      await onCreated(await fn());
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <div className="overlay" onClick={onClose}>
      <div className="dialog" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h3>{mode === 'direct' ? 'Start a chat' : 'Create a group'}</h3>
        {mode === 'group' && <input autoFocus placeholder="Group name" value={name} onChange={(e) => setName(e.target.value)} />}

        <ul className="user-list">
          {users.map((u) => (
            <li key={u.id}>
              {mode === 'direct' ? (
                <button className="user-row" onClick={() => run(() => api.createChat(me.id, u.id))}>
                  <span className="avatar">{initials(u.name)}</span>
                  <span><strong>{u.name}</strong><small>{u.email}</small></span>
                </button>
              ) : (
                <label className="user-row check">
                  <input type="checkbox" checked={selected.includes(u.id)} onChange={() => toggle(u.id)} />
                  <span className="avatar">{initials(u.name)}</span>
                  <span><strong>{u.name}</strong><small>{u.email}</small></span>
                </label>
              )}
            </li>
          ))}
        </ul>

        {error && <p className="error">{error}</p>}
        <div className="dialog-actions">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          {mode === 'group' && (
            <button className="btn" disabled={!name.trim() || selected.length === 0} onClick={() => run(() => api.createGroup(name.trim(), me.id, selected))}>
              Create group
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
