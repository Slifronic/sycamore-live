import { Segmented } from '@/components/Segmented';

type Tab = 'inbox' | 'events' | 'broadcasts' | 'automations';

export function MessagesTabs({ on, unread, chatUnread = 0 }: { on: Tab; unread: number; chatUnread?: number }) {
  return (
    <Segmented
      id="messages"
      label="Messages sections"
      items={[
        { href: '/org/messages', label: <>Inbox{unread > 0 && <b style={{ color: 'var(--red)' }}>{unread}</b>}</>, on: on === 'inbox' },
        { href: '/org/messages/events', label: <>Event chats{chatUnread > 0 && <b style={{ color: 'var(--red)' }}>{chatUnread}</b>}</>, on: on === 'events' },
        { href: '/org/messages/broadcasts', label: 'Broadcasts', on: on === 'broadcasts' },
        { href: '/org/messages/automations', label: 'Automations', on: on === 'automations' },
      ]}
    />
  );
}
