import { useEffect, useState } from 'react';
import { api } from './api';
import { ChatWindow } from './components/ChatWindow';
import { Sidebar } from './components/Sidebar';
import { UserPicker } from './components/UserPicker';
import { usePolling } from './lib';
import type { ChatSummary, User } from './types';

const STORAGE_KEY = 'relay:userId';

export default function App() {
  const [me, setMe] = useState<User | null>(null);
  const [booting, setBooting] = useState(true);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const id = localStorage.getItem(STORAGE_KEY);
    if (!id) return setBooting(false);
    api.listUsers()
      .then((users) => setMe(users.find((u) => u.id === id) ?? null))
      .catch(() => setMe(null))
      .finally(() => setBooting(false));
  }, []);

  const refreshChats = async () => {
    if (me) setChats(await api.listChats(me.id));
  };
  usePolling(refreshChats, 4000, [me?.id]);

  const login = (u: User) => {
    localStorage.setItem(STORAGE_KEY, u.id);
    setActiveId(null);
    setChats([]);
    setMe(u);
  };
  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setMe(null);
    setActiveId(null);
  };
  const openChat = async (chatId: string) => {
    await refreshChats();
    setActiveId(chatId);
  };

  if (booting) return <div className="boot">Loading…</div>;
  if (!me) return <UserPicker onPick={login} />;

  const active = chats.find((c) => c.id === activeId) ?? null;

  return (
    <div className={`shell ${active ? 'has-chat' : ''}`}>
      <Sidebar me={me} chats={chats} activeId={activeId} onSelect={setActiveId} onOpenChat={openChat} onSwitchUser={logout} />
      <main className="stage">
        {active ? (
          <ChatWindow key={active.id} chat={active} me={me} onChanged={refreshChats} onBack={() => setActiveId(null)} />
        ) : (
          <div className="empty-stage">
            <h2>Pick a conversation</h2>
            <p>Choose a chat from the list or start a new one with the buttons on the left.</p>
          </div>
        )}
      </main>
    </div>
  );
}
