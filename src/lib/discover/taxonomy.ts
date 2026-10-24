// Causes, skill groups and the small skill-adjacency map, ported unchanged
// from the prototype's dist/discover/taxonomy.js. The keyword rules extend the
// engine's dictionary the same way taxonomy.js did (logistics narrowed to
// "supply chain", twenty new skills appended).
import { baseSkillRules, extractWith } from './engine.ts';
import type { Role } from './types.ts';

export const groups: Record<string, { name: string; skills: string[] }> = {
  finance: { name: 'Accounting & finance', skills: ['budgeting', 'accounting', 'bookkeeping', 'excel', 'analysis', 'tax', 'cost analysis', 'quickbooks'] },
  business: { name: 'Business & research', skills: ['market research', 'fundraising', 'business planning', 'analysis'] },
  operations: { name: 'Operations & events', skills: ['events', 'logistics', 'inventory', 'leadership', 'project coordination', 'distribution'] },
  marketing: { name: 'Marketing & communications', skills: ['outreach', 'communication', 'social media', 'email marketing'] },
  creative: { name: 'Design & media', skills: ['design', 'photography', 'video editing', 'web design'] },
  technology: { name: 'Data & technology', skills: ['data entry', 'data visualization', 'web development', 'tech support'] },
  teaching: { name: 'Teaching & community', skills: ['tutoring', 'teaching', 'mentoring', 'translation', 'community'] },
  writing: { name: 'Writing & storytelling', skills: ['writing', 'editing', 'grant research'] },
  environment: { name: 'Environment & fieldwork', skills: ['planting', 'conservation', 'fieldwork'] },
};

export const causes = [
  'Food Access & Nutrition',
  'Environment & Conservation',
  'Education & Youth',
  'Community Development',
  'Financial Access',
  'Health & Wellbeing',
  'Housing & Basic Needs',
  'Arts & Culture',
  'Animal Welfare',
];

export const skillRules: Record<string, RegExp> = {
  ...baseSkillRules,
  logistics: /\blogistics\b|inventory|supply chain/i,
  bookkeeping: /\bbookkeep(?:ing|er)?\b/i,
  'cost analysis': /cost analys|supply quotes|supplier quotes/i,
  quickbooks: /quickbooks/i,
  'market research': /market research|competitor|competitive analys/i,
  fundraising: /fundrais|donor|sponsorship/i,
  'business planning': /business plan|strategic plan/i,
  inventory: /inventory|stock tracking/i,
  'project coordination': /project coordinat|project manag/i,
  'social media': /social media|instagram|tiktok/i,
  'email marketing': /email campaign|email marketing|newsletter/i,
  photography: /photograph/i,
  'video editing': /video edit|videography/i,
  'web design': /web design|ui design|ux design/i,
  'data entry': /data entry/i,
  'data visualization': /data visual|dashboard|power bi|tableau/i,
  'web development': /web develop|html|javascript|react|python/i,
  'tech support': /tech(?:nical)? support|it support/i,
  translation: /translat/i,
  editing: /\bedit(?:ing|or)?\b/i,
  'grant research': /grant research|grant writ/i,
};

export const extract = (text: string) => extractWith(skillRules, text);

const links: Record<string, string[]> = {
  budgeting: ['excel', 'accounting', 'bookkeeping', 'cost analysis'],
  accounting: ['bookkeeping', 'excel', 'tax', 'budgeting'],
  bookkeeping: ['accounting', 'excel', 'quickbooks'],
  excel: ['budgeting', 'data entry', 'data visualization', 'inventory'],
  analysis: ['market research', 'data visualization', 'cost analysis'],
  logistics: ['inventory', 'events', 'project coordination'],
  leadership: ['events', 'mentoring', 'project coordination'],
  events: ['project coordination', 'outreach', 'fundraising'],
  communication: ['outreach', 'teaching', 'writing'],
  design: ['web design', 'social media', 'photography'],
  writing: ['editing', 'grant research', 'email marketing'],
  tutoring: ['teaching', 'mentoring'],
  teaching: ['tutoring', 'mentoring'],
  conservation: ['planting', 'fieldwork'],
};

export function adjacent(a: string, b: string) {
  return a === b || (links[a] || []).includes(b) || (links[b] || []).includes(a);
}

export const allSkills = [...new Set(Object.values(groups).flatMap((g) => g.skills))];

/**
 * Splits pasted role descriptions into roles (one paragraph each, title on the
 * first line), proposes skill tags and keeps the sentence each tag came from.
 * Runs in the browser only; the text never leaves the page.
 */
export function extractRoles(text: string): Role[] {
  const blocks = text
    .trim()
    .split(/\n\s*\n|\n(?=[^\n]{2,90}\s[|—]\s)/)
    .filter(Boolean)
    .slice(0, 12);
  return blocks.map((block, i) => {
    const lines = block.split('\n').filter((x) => x.trim());
    const header = lines[0].replace(/^#+\s*/, '').trim();
    let title = (header.split(/\s[|—]\s/)[0] || 'Experience ' + (i + 1)).slice(0, 100);
    if (title.length > 80) title = 'Experience ' + (i + 1);
    const sentences = block.split(/\n|(?<=[.!?])\s+/).filter(Boolean);
    const body = lines.length > 1 ? lines.slice(1).join('\n') : block;
    const skills = extract(body);
    const evidence: Record<string, string> = {};
    for (const skill of skills) evidence[skill] = sentences.find((s) => skillRules[skill].test(s)) || block;
    return { id: 'role-' + i, title, description: block, skills, evidence };
  });
}
