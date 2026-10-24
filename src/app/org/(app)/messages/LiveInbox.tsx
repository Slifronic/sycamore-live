'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { markEventChatRead, markRead } from './actions';

// Pulls in new replies every 8 seconds while the tab is visible, marks the open
// conversation as read, and keeps it scrolled to the newest message. Works for a
// one-to-one thread (kind "dm", id = volunteer) or an event chat (id = event).
export function LiveInbox({ openId, lastUnreadId, streamId, kind = 'dm' }: { openId: string | null; lastUnreadId: string | null; streamId: string; kind?: 'dm' | 'chat' }) {
  const router = useRouter();
  const marked = useRef<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, 8000);
    return () => clearInterval(t);
  }, [router]);

  // Keyed on the newest unread message, so a reply that arrives while the
  // conversation is open gets marked read too.
  useEffect(() => {
    if (openId && lastUnreadId && marked.current !== lastUnreadId) {
      marked.current = lastUnreadId;
      void (kind === 'chat' ? markEventChatRead(openId) : markRead(openId));
    }
  }, [openId, lastUnreadId, kind]);

  useEffect(() => {
    const el = document.getElementById(streamId);
    if (el) el.scrollTop = el.scrollHeight;
  });

  return null;
}
