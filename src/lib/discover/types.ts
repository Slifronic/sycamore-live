// Shapes the Discover engine works on. Ported from the prototype
// (sycamore-volunteer-preview/dist/discover, in git at c169374).

export type Mode = 'experience' | 'learn' | 'interests';
export type Transport = 'transit' | 'car' | 'bike';
export type Format = 'inperson' | 'remote' | 'hybrid';

/** A listing. `null` always means "not known", never zero. */
export type Opportunity = {
  id: string;
  title: string;
  role: string;
  org: string;
  topic?: string; // v1 engine only
  cause: string | null;
  tags: string[];
  tasks: string[];
  day: string; // weekday name, e.g. "Saturday"
  time: string;
  weeks: number;
  travel: Record<Transport, number | null>; // minutes one way
  cost: number | null; // travel cost per visit
  support: number | null; // 0..5
  supportNote: string;
  training: string | null;
  status: 'open' | 'closed';
  kind?: string;
  outcome: string;
  // taxonomy (v2) fields
  area?: string | null;
  format?: Format;
  level?: string;
  required?: string[];
  practice?: string[];
  deliverable?: string;
  beginner?: boolean;
  sourceUrl?: string | null;
  checkedAt?: string | null;
};

export type Role = { id: string; title: string; description: string; skills: string[]; evidence: Record<string, string> };

export type Profile = {
  mode: Mode;
  topic?: string; // v1
  day: string; // 'any' or a weekday name
  transport: Transport;
  maxTravel: number;
  weeks: number;
  maxCost: number;
  cause: string; // 'any' or a cause name
  reviewed: boolean;
  skills?: string[]; // v1
  // v2
  taxonomyV2?: boolean;
  roleArea?: string; // 'any' or a group key
  format?: 'any' | Format;
  useSkills?: string[];
  learnSkills?: string[];
  roles?: Role[];
};

export type Component = { name: string; weight: number; rating: number | null; points: number | null; explanation: string };

export type Status = 'ready' | 'conditional' | 'training' | 'review' | 'excluded';

export type Evaluation = {
  opportunity: Opportunity;
  status: Status;
  reasons: string[];
  components: Component[];
  low: number; // supported fit points (rounded)
  high: number; // low plus every unknown criterion's full weight
  knownWeight: number;
  sortScore: number;
  travel: number | null;
  // v2 only
  matched: { skill: string; role: string; evidence: string }[];
  useMatches: string[];
  learnMatches: string[];
  gaps: string[];
};
