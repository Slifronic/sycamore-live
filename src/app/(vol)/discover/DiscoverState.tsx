'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Listing } from '@/lib/discover/listings';
import type { Mode, Profile, Role } from '@/lib/discover/types';
import s from './discover.module.css';

// Discover's state, held in this page's memory for as long as the tab is open.
// Preferences and the role history (the resume text, the reviewed roles) are
// never sent to the server or written to storage; a reload clears them. The
// one thing kept on the server is the saved list (event ids only).

export type Prefs = {
  mode: Mode;
  cause: string;
  roleArea: string;
  format: 'any' | 'inperson' | 'remote' | 'hybrid';
  day: string;
  useSkills: string[];
  learnSkills: string[];
};

export const DEFAULT_PREFS: Prefs = { mode: 'experience', cause: 'any', roleArea: 'any', format: 'any', day: 'any', useSkills: [], learnSkills: [] };

// The prototype's travel defaults. No listing has a known journey or cost yet,
// so these never exclude anything; they're here because the engine needs them.
const TRAVEL = { transport: 'transit', maxTravel: 45, weeks: 12, maxCost: 15 } as const;

type Draft = { text: string; roles: Role[]; reviewed: boolean };

type Ctx = {
  listings: Listing[];
  prefs: Prefs;
  setPrefs: (p: Partial<Prefs>) => void;
  resetPrefs: () => void;
  roles: Role[];
  reviewed: boolean;
  setBackground: (roles: Role[], reviewed: boolean) => void;
  draft: Draft;
  setDraft: (d: Partial<Draft>) => void;
  profile: Profile;
  tab: 'recommended' | 'all' | 'saved';
  setTab: (t: Ctx['tab']) => void;
  hidden: Set<string>;
  hide: (id: string) => void;
  unhideAll: () => void;
  saved: Set<string>;
  toggleSave: (id: string) => Promise<void>;
  notify: (msg: string) => void;
};

const DiscoverCtx = createContext<Ctx | null>(null);

export function useDiscover() {
  const c = useContext(DiscoverCtx);
  if (!c) throw new Error('useDiscover outside DiscoverProvider');
  return c;
}

export function DiscoverProvider({ listings, savedIds, children }: { listings: Listing[]; savedIds: string[]; children: React.ReactNode }) {
  const [prefs, setPrefsState] = useState<Prefs>(DEFAULT_PREFS);
  const [roles, setRoles] = useState<Role[]>([]);
  const [reviewed, setReviewed] = useState(false);
  const [draft, setDraftState] = useState<Draft>({ text: '', roles: [], reviewed: false });
  const [tab, setTab] = useState<Ctx['tab']>('recommended');
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [saved, setSavedState] = useState<Set<string>>(() => new Set(savedIds));
  const [toast, setToast] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(''), 3500);
  }, []);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const toggleSave = useCallback(
    async (id: string) => {
      const next = !saved.has(id);
      setSavedState((prev) => {
        const n = new Set(prev);
        if (next) n.add(id);
        else n.delete(id);
        return n;
      });
      const res = await fetch('/api/vol/saved', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ event_id: id, saved: next }) }).catch(() => null);
      if (!res?.ok) {
        // Put it back the way it was; the server is the record.
        setSavedState((prev) => {
          const n = new Set(prev);
          if (next) n.delete(id);
          else n.add(id);
          return n;
        });
        const data = await res?.json().catch(() => null);
        notify(data?.error ?? 'Couldn’t save that just now. Check your connection and try again.');
        return;
      }
      notify(next ? 'Saved to your list. Nothing was sent to the organization.' : 'Removed from your saved list.');
    },
    [saved, notify],
  );

  const value = useMemo<Ctx>(
    () => ({
      listings,
      prefs,
      setPrefs: (p) => setPrefsState((prev) => ({ ...prev, ...p })),
      resetPrefs: () => setPrefsState(DEFAULT_PREFS),
      roles,
      reviewed,
      setBackground: (r, ok) => {
        setRoles(r);
        setReviewed(ok);
      },
      draft,
      setDraft: (d) => setDraftState((prev) => ({ ...prev, ...d })),
      profile: { taxonomyV2: true, ...prefs, ...TRAVEL, reviewed, roles },
      tab,
      setTab,
      hidden,
      hide: (id) => setHidden((prev) => new Set(prev).add(id)),
      unhideAll: () => setHidden(new Set()),
      saved,
      toggleSave,
      notify,
    }),
    [listings, prefs, roles, reviewed, draft, tab, hidden, saved, toggleSave, notify],
  );

  return (
    <DiscoverCtx.Provider value={value}>
      {children}
      <p className={`${s.toast} ${toast ? s.toastOn : ''}`} role="status" aria-live="polite">
        {toast}
      </p>
    </DiscoverCtx.Provider>
  );
}
