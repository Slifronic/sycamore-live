// A steady colour per organization for the volunteer side (folders, record
// date tiles). Organizations don't pick one yet, so it comes from the id. The
// names are the tag palette in globals.css (.tag-sap … .tag-sun; grey stone is
// left out), which is tuned for both themes.

export const ORG_COLORS = ['sap', 'sky', 'clay', 'plum', 'sun'] as const;
export type OrgColor = (typeof ORG_COLORS)[number];

export function orgColor(id: string): OrgColor {
  let h = 1;
  for (let i = 0; i < id.length; i++) h = (h * 33 + id.charCodeAt(i)) >>> 0;
  return ORG_COLORS[h % ORG_COLORS.length]!;
}

/** "Riverside Restoration Crew" → "RR". Skips "the" and "of". */
export function orgInitials(name: string): string {
  const words = name.split(/\s+/).filter((w) => w && !/^(the|of|and|&)$/i.test(w));
  return (words[0]?.[0] ?? '?').toUpperCase() + (words[1]?.[0] ?? '').toUpperCase();
}
