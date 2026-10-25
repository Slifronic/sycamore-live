import Link from 'next/link';
import { requireVolunteer } from '@/lib/vol-data';
import { initials } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { ThemeToggle } from '@/components/shell/ThemeToggle';
import { Icon, type IconName } from '@/components/shell/icons';
import { volSignOut } from '../../actions';

export const metadata = { title: 'Me' };

// PLACEHOLDER from the round-1 shell (the "Me" tab). The volunteer agent
// replaces this with the full account screen: message opt-in, download my
// data, delete my account, Privacy and Terms. It keeps every page the old
// sidebar reached one tap away (Badges, My journey, Check in).

const LINKS: { href: string; label: string; icon: IconName }[] = [
  { href: '/me/badges', label: 'Badges', icon: 'award' },
  { href: '/me/journey', label: 'My journey', icon: 'route' },
  { href: '/checkin', label: 'Check in at an event', icon: 'scan' },
  { href: '/privacy', label: 'Privacy', icon: 'shield' },
  { href: '/terms', label: 'Terms', icon: 'report' },
];

export default async function AccountPage() {
  const vol = await requireVolunteer('/me/account');
  return (
    <div className="page" style={{ maxWidth: 560 }}>
      <PageHeader eyebrow="Your account" title="Me" />
      <div className="card card-pad row" style={{ gap: 14 }}>
        <span className="avatar" style={{ width: 48, height: 48, fontSize: 16 }} aria-hidden>
          {initials(vol.name)}
        </span>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontWeight: 700 }}>{vol.name}</p>
          <p className="muted small" style={{ overflowWrap: 'anywhere' }}>
            {vol.email}
          </p>
        </div>
      </div>
      <nav className="card" aria-label="Account" style={{ padding: 6 }}>
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="row" style={{ minHeight: 48, padding: '0 12px', borderRadius: 10, textDecoration: 'none', gap: 12 }}>
            <Icon name={l.icon} size={20} style={{ color: 'var(--ink-3)' }} />
            <span style={{ flex: 1, fontWeight: 600 }}>{l.label}</span>
            <Icon name="chevron-right" size={16} style={{ color: 'var(--ink-3)' }} />
          </Link>
        ))}
      </nav>
      <ThemeToggle variant="row" />
      <form action={volSignOut}>
        <button className="btn" style={{ width: '100%' }}>
          <Icon name="logout" size={16} /> Sign out on this device
        </button>
      </form>
    </div>
  );
}

// Reads the volunteer cookie, so it renders per request (like every /me page).
export const instant = false;
