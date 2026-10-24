import { fmtDay } from './format';

// Ready-to-send emails that open in the coordinator's own mail app. Nothing is
// sent by SycaMore; the coordinator reads and sends it themselves.

type Org = { name: string; coordinator_name: string };
type Next = { title: string; starts_at: Date; location: string | null } | undefined;

const link = (email: string, subject: string, body: string) =>
  `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

const nextLine = (next: Next) =>
  next ? `Our next event is ${next.title} on ${fmtDay(next.starts_at)}${next.location ? ` at ${next.location}` : ''}. ` : '';

export function inviteBack(org: Org, name: string, email: string, next: Next) {
  const first = name.split(' ')[0];
  return link(
    email,
    `We miss you at ${org.name}`,
    `Hi ${first},\n\nWe miss you at ${org.name}! ${nextLine(next)}Would you like to come?\n\nThanks for everything you've done with us.\n${org.coordinator_name}`,
  );
}

export function sayThanks(org: Org, name: string, email: string, next: Next) {
  const first = name.split(' ')[0];
  return link(
    email,
    `Thank you from ${org.name}`,
    `Hi ${first},\n\nThank you for volunteering with ${org.name}. It made a real difference. ${nextLine(next)}We'd love to see you again.\n\n${org.coordinator_name}`,
  );
}

export function milestoneThanks(org: Org, name: string, email: string, hours: number, next: Next) {
  const first = name.split(' ')[0];
  return link(
    email,
    `${hours} verified hours with ${org.name}!`,
    `Hi ${first},\n\nYou just passed ${hours} verified volunteer hours with ${org.name}. Thank you! Your record shows every one of them, verified by us, and you can share it with your school or on applications.\n\n${nextLine(next)}Hope to see you there.\n${org.coordinator_name}`,
  );
}
