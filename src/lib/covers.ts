// One place that decides which photograph stands for an event. Pure (no
// server-only) so client components such as Discover can use it too.
//
// The photos are scene-setting, never evidence: generic (AI-generated, per the
// manifest), not of the event itself.

import manifest from '../../public/media/manifest.json';

export type CoverKind = 'planting' | 'food' | 'cleanup' | 'tutoring' | 'shelter' | 'creek';

export type Cover = {
  kind: CoverKind;
  /** Full-size photo, for heroes. */
  src: string;
  /** Small photo, for thumbnails and cards. */
  srcSm: string;
  alt: string;
};

// Alt text comes from the asset manifest, so it always describes the actual photo.
const ALT_FALLBACK = 'Volunteer work outdoors';
const alt = (key: string) => (manifest as Record<string, { alt?: string }>)[key]?.alt ?? ALT_FALLBACK;

const file = (kind: CoverKind) => (kind === 'creek' ? 'hero-creek' : `cover-${kind}`);

export function coverOf(kind: CoverKind): Cover {
  return { kind, src: `/media/photo/${file(kind)}.webp`, srcSm: `/media/photo/${file(kind)}-sm.webp`, alt: alt(file(kind)) };
}

// Order matters: a "River Cleanup" filed under planting is a cleanup.
const RULES: [CoverKind, RegExp][] = [
  ['cleanup', /\b(clean ?-?ups?|litter|trash|debris|beach sweep|graffiti)\b/],
  ['food', /\b(food|pantry|pantries|fridge|meal|meals|grocer(y|ies)|kitchen|harvest|nutrition|soup|distribution)\b/],
  ['shelter', /\b(shelter|donations?|clothing|coat drive|drive|housing|homeless|unhoused|warming)\b/],
  ['tutoring', /\b(tutor(ing)?|homework|reading|teach(ing)?|mentor(ing)?|education|stem|school|literacy|zine|writing|workshop)\b/],
  ['planting', /\b(plant(ing)?|restor(e|ation)|trees?|seedlings?|garden(ing)?|habitat|native|weed(ing)?|creek)\b/],
];

const BY_ACTIVITY: Partial<Record<string, CoverKind>> = { planting: 'planting', education: 'tutoring' };

/** Picks a cover from the event's title, its tags, then its activity. */
export function coverFor(e: { title?: string | null; activity?: string | null; tags?: (string | { name: string })[] | null }): Cover {
  const tags = (e.tags ?? []).map((t) => (typeof t === 'string' ? t : t.name));
  for (const text of [e.title ?? '', tags.join(' ')]) {
    const hay = text.toLowerCase();
    for (const [kind, re] of RULES) if (re.test(hay)) return coverOf(kind);
  }
  const byActivity = e.activity ? BY_ACTIVITY[e.activity] : undefined;
  return coverOf(byActivity ?? 'creek');
}

/** Illustrations for empty states and moments. */
export type Illo = 'sapling' | 'ledger' | 'envelope' | 'compass' | 'seed-pod' | 'leaf-badge';
export const illoSrc = (name: Illo, small = true) => `/media/illo/${name}${small ? '-sm' : ''}.webp`;
