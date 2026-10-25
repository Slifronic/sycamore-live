import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { sql } from '@/lib/db';
import { getPublishedCampaign } from '@/lib/story';
import { Reel, type Shot } from '@/components/Reel';
import { Cover } from '@/components/media/Cover';
import { coverFor } from '@/lib/covers';
import s from './campaign.module.css';

// Public campaign page. Numbers come from the snapshot of the attested record
// taken when the campaign was last saved; only consented clips play.

async function load(slug: string) {
  const campaign = await getPublishedCampaign(slug);
  if (!campaign) return null;
  const ids = campaign.draft.storyboard.map((sh) => sh.clip_id);
  const clips = ids.length
    ? ((await sql`select id, poster_path from story_clip where id = any(${ids}) and consent`) as unknown as { id: string; poster_path: string | null }[])
    : [];
  const ok = new Map(clips.map((c) => [c.id, c]));
  const shots: Shot[] = campaign.draft.storyboard
    .filter((sh) => ok.has(sh.clip_id))
    .map((sh) => ({
      src: `/api/media/clip/${sh.clip_id}/video`,
      poster: ok.get(sh.clip_id)!.poster_path ? `/api/media/clip/${sh.clip_id}/poster` : null,
      start: sh.start_s,
      end: sh.end_s,
      caption: sh.caption,
    }));
  return { campaign, shots };
}

export async function generateMetadata({ params }: PageProps<'/c/[slug]'>): Promise<Metadata> {
  const data = await load((await params).slug);
  if (!data) return { title: 'Campaign not found' };
  const { draft, facts } = data.campaign;
  return { title: `${draft.headline} · ${facts.org.name}`, description: draft.subhead };
}

export default async function CampaignPage({ params }: PageProps<'/c/[slug]'>) {
  const data = await load((await params).slug);
  if (!data) notFound();
  const { campaign, shots } = data;
  const { draft, facts } = campaign;

  return (
    <main className={s.page}>
      {shots.length === 0 ? (
        // No consented clips to play: a cover photo for the kind of work carries the header.
        <header className={s.head}>
          <Cover cover={coverFor({ title: facts.event.title })} variant="hero" priority className="settle">
            <p className={`${s.org} ${s.onPhoto} rise`}>{facts.org.name}</p>
            <h1 className={`${s.title} ${s.onPhoto} rise`} style={{ ['--d' as string]: '0.08s' }}>
              {draft.headline}
            </h1>
          </Cover>
          <p className={`${s.sub} rise`} style={{ ['--d' as string]: '0.16s' }}>
            {draft.subhead}
          </p>
        </header>
      ) : (
        <header className={s.head}>
          <p className={`${s.org} rise`}>{facts.org.name}</p>
          <h1 className={`${s.title} rise`} style={{ ['--d' as string]: '0.08s' }}>
            {draft.headline}
          </h1>
          <p className={`${s.sub} rise`} style={{ ['--d' as string]: '0.16s' }}>
            {draft.subhead}
          </p>
        </header>
      )}

      {shots.length > 0 && <Reel shots={shots} label={`Highlights from ${facts.event.title}`} />}

      <section className={`${s.verified} rise`} style={{ ['--d' as string]: '0.24s' }} aria-label="Verified record">
        <span className={s.check} aria-hidden>✓</span>
        <div>
          <p className={s.vLine}>
            <strong className="num">{facts.volunteers}</strong> volunteers · <strong className="num">{facts.verified_hours}</strong> verified hours ·{' '}
            {facts.event.title}, {facts.event.date}
          </p>
          <p className="small muted">
            Hours attested by {facts.org.name}{facts.verified_on ? ` on ${facts.verified_on}` : ''} from check-in and check-out records.
            Worth about ${facts.volunteer_value_usd.toLocaleString()} in volunteer time at the {facts.rate.label} rate.
          </p>
        </div>
      </section>

      <article className={s.story}>
        {draft.story.split(/\n{2,}/).map((p, i) => (
          <p key={i} className="reveal">
            {p}
          </p>
        ))}
      </article>

      {draft.quote && (
        <blockquote className={`${s.quote} reveal`}>
          <p>“{draft.quote}”</p>
          <footer>{facts.org.coordinator}, {facts.org.name}</footer>
        </blockquote>
      )}

      <section className={s.cta}>
        <p>{draft.call_to_action}</p>
        <a className="btn btn-big btn-primary" href={`mailto:${facts.org.contact_email}?subject=${encodeURIComponent(`Next event after ${facts.event.title}`)}`}>
          Get in touch with {facts.org.name}
        </a>
        {draft.hashtags.length > 0 && <p className="small muted">{draft.hashtags.join(' ')}</p>}
      </section>

      <footer className={s.foot}>
        <p className="small muted">
          Story drafted with Claude from the coordinator’s own debrief and videos, then reviewed and published by {facts.org.name}. Every number on this page comes from the organization’s attested record or the coordinator’s own words.
        </p>
        <p className="small muted">Recorded with SycaMore Live</p>
      </footer>
    </main>
  );
}

export const instant = false;
