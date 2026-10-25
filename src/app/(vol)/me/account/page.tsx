import Link from 'next/link';
import { requireVolunteer } from '@/lib/vol-data';
import { initials } from '@/lib/format';
import { ThemeToggle } from '@/components/shell/ThemeToggle';
import { Icon, type IconName } from '@/components/shell/icons';
import { Stagger } from '@/components/motion/Stagger';
import { volSignOut } from '../../actions';
import { accountSettings } from '@/app/api/vol/_account';
import { DeleteAccount, MarketingSwitch } from './AccountClient';
import s from './account.module.css';

export const metadata = { title: 'Me' };

// The Me tab: who you are, your settings, your data. Grouped rows like a
// phone's settings screen. Badges and Journey live here too, one tap away.

function Row({ href, icon, label, hint, external }: { href: string; icon: IconName; label: string; hint?: string; external?: boolean }) {
  const inner = (
    <>
      <span className={s.rowIcon} aria-hidden>
        <Icon name={icon} size={20} />
      </span>
      <span className={s.rowText}>
        <span className={s.rowLabel}>{label}</span>
        {hint && <span className={s.rowHint}>{hint}</span>}
      </span>
      <Icon name={external ? 'download' : 'chevron-right'} size={16} className={s.chev} />
    </>
  );
  return external ? (
    <a href={href} className={s.row} download>
      {inner}
    </a>
  ) : (
    <Link href={href} className={s.row}>
      {inner}
    </Link>
  );
}

export default async function AccountPage() {
  const vol = await requireVolunteer('/me/account');
  const settings = await accountSettings(vol.id);

  return (
    <Stagger className={s.page}>
      <section className={s.who} aria-label="Your profile">
        <span className={s.avatar} aria-hidden>
          {initials(vol.name)}
        </span>
        <div className={s.whoText}>
          <h1 className={s.name}>{vol.name}</h1>
          <p className={s.email}>{vol.email}</p>
        </div>
        {vol.is_minor && <span className="chip chip-ink">Under 18</span>}
      </section>

      <nav className={s.list} aria-label="Your service">
        <Row href="/me/badges" icon="award" label="Badges" />
        <Row href="/me/journey" icon="route" label="Journey" />
      </nav>

      <section className={s.group} aria-labelledby="settings-h">
        <h2 id="settings-h" className={s.groupLabel}>
          Settings
        </h2>
        <div className={s.list}>
          <ThemeToggle variant="row" className={s.themeRow} />
          <MarketingSwitch initial={settings?.marketing_opt_in ?? false} />
        </div>
      </section>

      <section className={s.group} aria-labelledby="data-h">
        <h2 id="data-h" className={s.groupLabel}>
          Your data
        </h2>
        <div className={s.list}>
        <Row href="/api/vol/account/export" icon="download" label="Download my data" hint="Everything we keep, as a JSON file" external />
        <Row href="/privacy" icon="shield" label="Privacy" />
        <Row href="/terms" icon="report" label="Terms" />
        <Row href="/data" icon="clipboard" label="Deletion and retention" />
        <DeleteAccount />
        </div>
      </section>

      <form action={volSignOut} className={s.signout}>
        <button className="btn btn-big">
          <Icon name="logout" size={16} /> Sign out on this device
        </button>
      </form>
    </Stagger>
  );
}

// Reads the volunteer cookie, so it renders per request (like every /me page).
export const instant = false;
