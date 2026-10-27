import { useEffect, useState } from 'react';
import { api } from '../api';
import { initials } from '../lib';
import type { User } from '../types';

export function UserPicker({ onPick }: { onPick: (u: User) => void }) {
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.listUsers().then(setUsers).catch((e: Error) => setError(e.message));
  }, []);

  const create = async () => {
    setError('');
    try {
      onPick(await api.createUser(name, email));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="picker">
      <div className="picker-card">
        <h1>Chat App</h1>
        <p className="muted">Choose who you are. Open a second browser window as another user to test live chat.</p>

        <ul className="user-list">
          {users.map((u) => (
            <li key={u.id}>
              <button className="user-row" onClick={() => onPick(u)}>
                <span className="avatar">{initials(u.name)}</span>
                <span><strong>{u.name}</strong><small>{u.email}</small></span>
              </button>
            </li>
          ))}
          {users.length === 0 && <li className="muted">No users yet. Create one below.</li>}
        </ul>

        <div className="new-user">
          <input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="btn" disabled={!name.trim() || !email.trim()} onClick={create}>Create user</button>
        </div>
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}
