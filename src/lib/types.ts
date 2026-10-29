// Shared types. The first block mirrors build/00-SHARED-CONTRACT.md exactly;
// the second block is organization-side additions.

export type Role = 'general' | 'team_lead' | 'event_coordinator' | 'program_manager';
export type AttendanceStatus = 'checked_in' | 'checked_out' | 'no_show' | 'attested';
export type Method = 'qr' | 'code' | 'coordinator' | 'paper_import' | 'walk_in'; // walk_in: org addition

export type SheetDraft = {
  display_name: string;
  checked_in_at: string | null;
  checked_out_at: string | null;
  confidence: number;
  notes?: string;
  name_unclear?: boolean; // the model couldn't read all of the name
};

export type RecordView = {
  id: string;
  code: string | null;
  status: 'active' | 'revoked';
  volunteer_name: string;
  // reviewed: SycaMore checked the organization is real. verified_domain: the email domain of the
  // owner's Google-confirmed account, when the org has one (personal mail like gmail.com is left out).
  org: { name: string; contact_phone: string; contact_email: string; reviewed: boolean; verified_domain: string | null };
  event: { title: string; location: string | null; date: string };
  role: Role;
  hours_total: number;
  hours_captured: number;
  hours_adjusted: number | null;
  adjusted_by: string | null;
  adjustment_reason: string | null;
  attested_at: string;
};

export type Org = {
  id: string;
  name: string;
  contact_phone: string;
  contact_email: string;
  coordinator_name: string;
  coordinator_pin: string;
  pin_enabled: boolean;
  reviewed_at: Date | null;
  kind: 'nonprofit' | 'school';
  city: string | null;
  course: Record<string, string>;
  calendar_token: string;
};

export type Activity = 'general' | 'planting' | 'logistics' | 'outreach' | 'education';

export type EventRow = {
  id: string;
  org_id: string;
  title: string;
  location: string | null;
  starts_at: Date;
  ends_at: Date;
  checkin_code: string;
  status: 'open' | 'closed';
  closed_at: Date | null;
  activity: Activity;
  is_practice: boolean;
  goal_outcome: 'yes' | 'partly' | 'no' | null;
  cohort_rating: number | null;
  attested_at: Date | null;
  goal_text: string | null;
  outcome_text: string | null;
  site_lat: number | null;
  site_lng: number | null;
  site_radius_m: number;
  walkin_token: string | null;
  walkin_open: boolean;
  walkin_until: Date | null;
  // event intake (org addition)
  place_name: string | null;
  place_address: string | null;
  place_lat: number | null;
  place_lng: number | null;
  place_url: string | null;
  volunteer_notes: string | null;
  source: 'manual' | 'ics' | 'feed' | 'link' | 'text' | 'image' | 'repeat';
  source_uid: string | null;
  public_slug: string;
};

export type AttendanceRow = {
  id: string;
  event_id: string;
  volunteer_id: string | null;
  display_name: string;
  method: Method;
  checked_in_at: Date | null;
  checked_out_at: Date | null;
  hours_captured: number;
  hours_adjusted: number | null;
  adjustment_reason: string | null;
  role: Role;
  status: AttendanceStatus;
  attested_at: Date | null;
  ai_confidence: number | null;
  standout: boolean;
  location_opt_in: boolean;
  last_ping_at: Date | null;
  outside_since: Date | null;
  left_area_at: Date | null;
  left_area_m: number | null;
  new_signup?: boolean | null;   // read-only, from getRoster: this event is where they signed up
};

export const ROLE_LABEL: Record<Role, string> = {
  general: 'General volunteer',
  team_lead: 'Team lead',
  event_coordinator: 'Event coordinator',
  program_manager: 'Program manager',
};

export const ACTIVITY_LABEL: Record<Activity, string> = {
  general: 'General service',
  planting: 'Tree planting & restoration',
  logistics: 'Sorting & logistics',
  outreach: 'Outreach',
  education: 'Tutoring & education',
};
