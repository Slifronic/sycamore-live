import 'server-only';
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { claude, claudeEnabled } from './claude';
import { BLURB_INSTRUCTIONS, numbersOk, templateBlurb, type BlurbFacts, type BlurbKind } from './blurb';
import { longDate } from '@/components/vol/RecordWording';
import { ROLE_LABEL } from './types';
import type { VolRecord } from './vol-data';

// POST /api/vol/records/:id/blurb. The input is built from the attested record
// only (org, event, date, role, hours); nothing the volunteer typed is sent.
// Provider: OpenAI when OPENAI_API_KEY is set (the volunteer side's planned
// provider), else Claude through lib/claude.ts, else the template. Structured
// JSON output either way. If the reply carries a number that isn't in the
// facts, ask once more; if that fails too, use the template.

export type Blurb = { text: string; numbers_ok: boolean; source: 'openai' | 'claude' | 'template' };

const Reply = z.object({ text: z.string().describe('The sentence, plain text') });

export const blurbFacts = (r: VolRecord): BlurbFacts => ({
  organization: r.org.name,
  event: r.event.title,
  date: longDate(r.event.date),
  role: ROLE_LABEL[r.role],
  hours: r.hours_total,
});

async function viaOpenAI(kind: BlurbKind, facts: BlurbFacts): Promise<string | null> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    signal: AbortSignal.timeout(20_000),
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      max_tokens: 200,
      messages: [
        { role: 'system', content: BLURB_INSTRUCTIONS(kind) },
        { role: 'user', content: `FACTS:\n${JSON.stringify(facts, null, 2)}` },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'blurb', strict: true, schema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false } },
      },
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const data = await res.json();
  const parsed = Reply.safeParse(JSON.parse(data?.choices?.[0]?.message?.content ?? 'null'));
  return parsed.success ? parsed.data.text : null;
}

async function viaClaude(kind: BlurbKind, facts: BlurbFacts): Promise<string | null> {
  const res = await claude().messages.parse({
    model: 'claude-opus-5-5',
    max_tokens: 1000,
    output_config: { effort: 'low', format: zodOutputFormat(Reply) },
    messages: [{ role: 'user', content: `${BLURB_INSTRUCTIONS(kind)}\n\nFACTS:\n${JSON.stringify(facts, null, 2)}` }],
  }, { timeout: 30_000, maxRetries: 0 }); // a slow reply falls back to the template rather than leave the volunteer waiting
  if (res.stop_reason === 'refusal') return null;
  return res.parsed_output?.text ?? null;
}

export async function writeBlurb(kind: BlurbKind, r: VolRecord): Promise<Blurb> {
  const facts = blurbFacts(r);
  const template: Blurb = { text: templateBlurb(kind, facts), numbers_ok: numbersOk(templateBlurb(kind, facts), facts), source: 'template' };
  const provider = process.env.OPENAI_API_KEY ? 'openai' : claudeEnabled() ? 'claude' : null;
  if (!provider) return template;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = provider === 'openai' ? await viaOpenAI(kind, facts) : await viaClaude(kind, facts);
      const text = raw?.replace(/\s+/g, ' ').trim().slice(0, 400);
      if (text && numbersOk(text, facts)) return { text, numbers_ok: true, source: provider };
      if (text) console.warn(`[blurb] attempt ${attempt + 1}: rejected a reply with numbers not in the record`);
    } catch (e) {
      console.warn('[blurb] provider error, using the template:', (e as Error).message);
      return template;
    }
  }
  return template;
}
