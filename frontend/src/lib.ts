import { useEffect, useRef } from 'react';
import type { ChatSummary } from './types';

export function chatTitle(chat: ChatSummary, meId: string): string {
  if (chat.type === 'group') return chat.name ?? 'Group';
  return chat.members.find((m) => m.id !== meId)?.name ?? 'Chat';
}

export function initials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}

export function formatTime(iso: string | null): string {
  return iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
}

export function formatDay(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Runs `fn` immediately and then every `ms`. Restarts when `deps` change. */
export function usePolling(fn: () => Promise<void> | void, ms: number, deps: ReadonlyArray<unknown>): void {
  const latest = useRef(fn);
  latest.current = fn;
  useEffect(() => {
    const run = async () => {
      try {
        await latest.current();
      } catch {
        /* transient network errors are retried on the next tick */
      }
    };
    void run();
    const timer = setInterval(() => void run(), ms);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
